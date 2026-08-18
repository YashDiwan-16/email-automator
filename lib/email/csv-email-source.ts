import { parse } from "csv-parse/sync";

import type { DeliverySummary } from "@/types/email";

import type { EmailProvider } from "./provider";
import { emailAddressGroupsSchema } from "./schema";
import { sendPredefinedEmail } from "./service";

const MAX_CSV_BYTES = 2 * 1_024 * 1_024;
const MAX_CSV_ROWS = 1_000;

interface RawCsvRow {
  to?: string;
  cc?: string;
  bcc?: string;
}

export interface CsvEmailRow {
  rowNumber: number;
  to: string[];
  cc: string[];
  bcc: string[];
}

export interface CsvRowValidationError {
  rowNumber: number;
  messages: string[];
}

export interface ParsedEmailCsv {
  rows: CsvEmailRow[];
  errors: CsvRowValidationError[];
}

export interface CsvEmailDeliveryRow {
  rowNumber: number;
  summary: DeliverySummary;
}

export interface CsvEmailBatchSummary {
  acceptedCount: number;
  failedCount: number;
  rows: CsvEmailDeliveryRow[];
}

interface SendCsvEmailBatchOptions {
  provider: EmailProvider;
  sender: {
    email: string;
    name: string;
  };
  replyTo?: string;
  rows: CsvEmailRow[];
  concurrency?: number;
  retryDelayMs?: number;
}

export class CsvInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvInputError";
  }
}

function formatAddressIssue(path: PropertyKey[], message: string): string {
  const field = path[0];
  const label = field === "cc" ? "CC" : field === "bcc" ? "BCC" : "To";

  return `${label}: ${message}`;
}

export function parseEmailCsv(contents: string): ParsedEmailCsv {
  if (Buffer.byteLength(contents, "utf8") > MAX_CSV_BYTES) {
    throw new CsvInputError("CSV must be 2 MB or smaller.");
  }

  let headers: string[] = [];
  let records: RawCsvRow[];

  try {
    records = parse<RawCsvRow>(contents, {
      bom: true,
      columns: (values: string[]) => {
        headers = values.map((value) => value.trim().toLocaleLowerCase("en-US"));
        return headers;
      },
      max_record_size: 20_000,
      relax_column_count: false,
      skip_empty_lines: true,
      trim: true,
    });
  } catch {
    throw new CsvInputError("CSV could not be parsed. Check its headers and quoting.");
  }

  if (!headers.includes("to")) {
    throw new CsvInputError('CSV must include a "to" header.');
  }

  if (new Set(headers).size !== headers.length) {
    throw new CsvInputError("CSV headers must not be repeated.");
  }

  if (records.length > MAX_CSV_ROWS) {
    throw new CsvInputError(`CSV can contain no more than ${MAX_CSV_ROWS} rows.`);
  }

  const rows: CsvEmailRow[] = [];
  const errors: CsvRowValidationError[] = [];

  records.forEach((record, index) => {
    const rowNumber = index + 2;
    const parsed = emailAddressGroupsSchema.safeParse({
      to: record.to ?? "",
      cc: record.cc ?? "",
      bcc: record.bcc ?? "",
    });

    if (!parsed.success) {
      errors.push({
        rowNumber,
        messages: parsed.error.issues.map((issue) =>
          formatAddressIssue(issue.path, issue.message),
        ),
      });
      return;
    }

    rows.push({ rowNumber, ...parsed.data });
  });

  return { rows, errors };
}

async function mapWithConcurrency<T, TResult>(
  values: T[],
  concurrency: number,
  operation: (value: T) => Promise<TResult>,
): Promise<TResult[]> {
  const results = new Array<TResult>(values.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await operation(values[currentIndex] as T);
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), values.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

export async function sendCsvEmailBatch({
  provider,
  sender,
  replyTo,
  rows,
  concurrency = 3,
  retryDelayMs,
}: SendCsvEmailBatchOptions): Promise<CsvEmailBatchSummary> {
  const deliveryRows = await mapWithConcurrency(
    rows,
    concurrency,
    async (row): Promise<CsvEmailDeliveryRow> => ({
      rowNumber: row.rowNumber,
      summary: await sendPredefinedEmail({
        provider,
        input: {
          sender,
          replyTo,
          to: row.to,
          cc: row.cc,
          bcc: row.bcc,
        },
        retryDelayMs,
      }),
    }),
  );

  return deliveryRows.reduce<CsvEmailBatchSummary>(
    (summary, row) => ({
      acceptedCount: summary.acceptedCount + row.summary.acceptedCount,
      failedCount: summary.failedCount + row.summary.failedCount,
      rows: [...summary.rows, row],
    }),
    { acceptedCount: 0, failedCount: 0, rows: [] },
  );
}
