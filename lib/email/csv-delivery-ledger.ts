import { createHash, randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";

import type { DeliverySummary } from "@/types/email";

import type { CsvEmailRow } from "./csv-email-source";

const LEDGER_VERSION = 1;

export interface CsvDeliveryLedgerContext {
  senderEmail: string;
  replyTo?: string;
  templateVersion: string;
}

export interface PlannedCsvEmailRow extends CsvEmailRow {
  deliveryRecipients: string[];
}

interface SerializedLedger {
  version: typeof LEDGER_VERSION;
  acceptedRecipientKeys: string[];
}

export class CsvDeliveryLedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvDeliveryLedgerError";
  }
}

function rowFingerprint(
  row: CsvEmailRow,
  context: CsvDeliveryLedgerContext,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        templateVersion: context.templateVersion,
        senderEmail: context.senderEmail.toLocaleLowerCase("en-US"),
        replyTo: context.replyTo?.toLocaleLowerCase("en-US"),
        university: row.university,
        to: row.to,
        cc: row.cc,
        bcc: row.bcc,
      }),
    )
    .digest("hex");
}

function recipientDeliveryKey(
  row: CsvEmailRow,
  recipient: string,
  context: CsvDeliveryLedgerContext,
): string {
  return createHash("sha256")
    .update(rowFingerprint(row, context))
    .update("\0")
    .update(recipient.toLocaleLowerCase("en-US"))
    .digest("hex");
}

function rowRecipients(row: CsvEmailRow): string[] {
  return [...row.to, ...row.cc, ...row.bcc];
}

function parseSerializedLedger(serialized: string): SerializedLedger {
  let value: unknown;

  try {
    value = JSON.parse(serialized);
  } catch {
    throw new CsvDeliveryLedgerError("The CSV delivery ledger is not valid JSON.");
  }

  if (
    typeof value !== "object" ||
    value === null ||
    Reflect.get(value, "version") !== LEDGER_VERSION ||
    !Array.isArray(Reflect.get(value, "acceptedRecipientKeys")) ||
    !(Reflect.get(value, "acceptedRecipientKeys") as unknown[]).every(
      (key) => typeof key === "string" && /^[a-f0-9]{64}$/u.test(key),
    )
  ) {
    throw new CsvDeliveryLedgerError("The CSV delivery ledger has an invalid shape.");
  }

  return value as SerializedLedger;
}

export class CsvDeliveryLedger {
  private constructor(private readonly acceptedRecipientKeys: Set<string>) {}

  static empty(): CsvDeliveryLedger {
    return new CsvDeliveryLedger(new Set());
  }

  static parse(serialized: string): CsvDeliveryLedger {
    const value = parseSerializedLedger(serialized);
    return new CsvDeliveryLedger(new Set(value.acceptedRecipientKeys));
  }

  plan(
    rows: CsvEmailRow[],
    context: CsvDeliveryLedgerContext,
    options: { force?: boolean } = {},
  ): PlannedCsvEmailRow[] {
    const scheduledKeys = new Set(
      options.force ? [] : this.acceptedRecipientKeys,
    );

    return rows.flatMap((row) => {
      const deliveryRecipients = rowRecipients(row).filter((recipient) => {
        const key = recipientDeliveryKey(row, recipient, context);
        if (scheduledKeys.has(key)) {
          return false;
        }

        scheduledKeys.add(key);
        return true;
      });

      return deliveryRecipients.length > 0
        ? [{ ...row, deliveryRecipients }]
        : [];
    });
  }

  recordAccepted(
    row: CsvEmailRow,
    context: CsvDeliveryLedgerContext,
    summary: DeliverySummary,
  ): void {
    for (const result of summary.recipients) {
      if (result.status === "accepted") {
        this.acceptedRecipientKeys.add(
          recipientDeliveryKey(row, result.recipient, context),
        );
      }
    }
  }

  serialize(): string {
    return `${JSON.stringify(
      {
        version: LEDGER_VERSION,
        acceptedRecipientKeys: [...this.acceptedRecipientKeys].sort(),
      } satisfies SerializedLedger,
      null,
      2,
    )}\n`;
  }
}

export class CsvDeliveryLedgerStore {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async load(): Promise<CsvDeliveryLedger> {
    try {
      return CsvDeliveryLedger.parse(await readFile(this.filePath, "utf8"));
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        Reflect.get(error, "code") === "ENOENT"
      ) {
        return CsvDeliveryLedger.empty();
      }

      throw error;
    }
  }

  save(ledger: CsvDeliveryLedger): Promise<void> {
    const serialized = ledger.serialize();

    this.writeQueue = this.writeQueue.then(async () => {
      const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
      await writeFile(temporaryPath, serialized, { encoding: "utf8", mode: 0o600 });
      await rename(temporaryPath, this.filePath);
    });

    return this.writeQueue;
  }
}
