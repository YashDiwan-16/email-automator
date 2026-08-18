import { parse } from "csv-parse/sync";

import {
  type AddressGroups,
  emailAddressGroupsSchema,
  universityNameSchema,
} from "./schema";

const MAX_CSV_BYTES = 2 * 1_024 * 1_024;
const MAX_CSV_ROWS = 1_000;

interface RawCsvRow {
  to?: string;
  university?: string;
  cc?: string;
  bcc?: string;
}

export interface CsvEmailRow extends AddressGroups {
  rowNumber: number;
  university: string;
}

export interface CsvRowValidationError {
  rowNumber: number;
  messages: string[];
}

export interface ParsedEmailCsv {
  rows: CsvEmailRow[];
  errors: CsvRowValidationError[];
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

  if (!headers.includes("university")) {
    throw new CsvInputError('CSV must include a "university" header.');
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
    const parsedUniversity = universityNameSchema.safeParse(
      record.university ?? "",
    );
    const parsedAddresses = emailAddressGroupsSchema.safeParse({
      to: record.to ?? "",
      cc: record.cc ?? "",
      bcc: record.bcc ?? "",
    });
    const messages = [
      ...(parsedUniversity.success
        ? []
        : parsedUniversity.error.issues.map(
            (issue) => `University: ${issue.message}`,
          )),
      ...(parsedAddresses.success
        ? []
        : parsedAddresses.error.issues.map((issue) =>
            formatAddressIssue(issue.path, issue.message),
          )),
    ];

    if (!parsedUniversity.success || !parsedAddresses.success) {
      errors.push({ rowNumber, messages });
      return;
    }

    rows.push({
      rowNumber,
      university: parsedUniversity.data,
      ...parsedAddresses.data,
    });
  });

  return { rows, errors };
}
