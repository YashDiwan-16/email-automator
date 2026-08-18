import type { DeliverySummary } from "@/types/email";

import type { EmailSender } from "./configuration";
import type { CsvEmailRow } from "./csv-email-source";
import type { EmailProvider } from "./provider";
import { sendPredefinedEmail } from "./service";

export interface SendableCsvEmailRow extends CsvEmailRow {
  deliveryRecipients?: string[];
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
  sender: EmailSender;
  replyTo?: string;
  rows: SendableCsvEmailRow[];
  concurrency?: number;
  retryDelayMs?: number;
  onRowComplete?: (
    row: SendableCsvEmailRow,
    delivery: CsvEmailDeliveryRow,
  ) => Promise<void> | void;
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
  onRowComplete,
}: SendCsvEmailBatchOptions): Promise<CsvEmailBatchSummary> {
  const deliveryRows = await mapWithConcurrency(
    rows,
    concurrency,
    async (row): Promise<CsvEmailDeliveryRow> => {
      const delivery = {
        rowNumber: row.rowNumber,
        summary: await sendPredefinedEmail({
          provider,
          input: {
            sender,
            replyTo,
            university: row.university,
            to: row.to,
            cc: row.cc,
            bcc: row.bcc,
            deliveryRecipients: row.deliveryRecipients,
          },
          retryDelayMs,
        }),
      };

      await onRowComplete?.(row, delivery);
      return delivery;
    },
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
