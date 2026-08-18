import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import {
  CsvDeliveryLedgerError,
  CsvDeliveryLedgerStore,
} from "../lib/email/csv-delivery-ledger";
import {
  CsvInputError,
  parseEmailCsv,
} from "../lib/email/csv-email-source";
import { sendCsvEmailBatch } from "../lib/email/csv-email-batch";
import { createNodemailerEmailProvider } from "../lib/email/nodemailer-provider";
import {
  EnvironmentConfigurationError,
  getEmailRuntimeConfiguration,
} from "../lib/email/runtime-config";
import { PREDEFINED_EMAIL_TEMPLATE } from "../lib/email/template";

interface CommandLineOptions {
  filename: string;
  force: boolean;
}

function parseCommandLine(arguments_: string[]): CommandLineOptions {
  const force = arguments_.includes("--force");
  const filenames = arguments_.filter((argument) => argument !== "--force");

  if (
    filenames.length !== 1 ||
    arguments_.some((argument) => argument.startsWith("--") && argument !== "--force")
  ) {
    throw new CsvInputError("Usage: pnpm send <file.csv> [--force]");
  }

  return { filename: filenames[0] as string, force };
}

function resolveCsvPath(argument: string): string {
  const filename = argument.endsWith(".csv") ? argument : `${argument}.csv`;
  if (path.basename(filename) !== filename) {
    throw new CsvInputError("CSV files must be selected by name from the data folder.");
  }

  return path.join(process.cwd(), "data", filename);
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());

  const commandLine = parseCommandLine(process.argv.slice(2));
  const csvPath = resolveCsvPath(commandLine.filename);
  const contents = await readFile(csvPath, "utf8");
  const parsed = parseEmailCsv(contents);

  if (parsed.errors.length > 0) {
    console.error("CSV validation failed; no emails were sent.");
    for (const error of parsed.errors) {
      console.error(`Row ${error.rowNumber}: ${error.messages.join("; ")}`);
    }
    process.exitCode = 1;
    return;
  }

  if (parsed.rows.length === 0) {
    throw new CsvInputError("CSV contains no recipient rows.");
  }

  const environment = getEmailRuntimeConfiguration(process.env);
  const provider = createNodemailerEmailProvider(environment.smtp);
  const ledgerContext = {
    senderEmail: environment.sender.email,
    replyTo: environment.replyTo,
    templateVersion: PREDEFINED_EMAIL_TEMPLATE.version,
  };
  const ledgerStore = new CsvDeliveryLedgerStore(
    path.join(process.cwd(), "data", ".email-send-ledger.json"),
  );
  const ledger = await ledgerStore.load();
  const rows = ledger.plan(parsed.rows, ledgerContext, {
    force: commandLine.force,
  });
  const recipientCount = parsed.rows.reduce(
    (count, row) => count + row.to.length + row.cc.length + row.bcc.length,
    0,
  );
  const pendingRecipientCount = rows.reduce(
    (count, row) => count + row.deliveryRecipients.length,
    0,
  );

  if (pendingRecipientCount === 0) {
    console.log("No pending recipients. Use --force to send this template again.");
    return;
  }

  console.log(
    `Sending template "${PREDEFINED_EMAIL_TEMPLATE.subject}" to ${pendingRecipientCount} pending recipients across ${rows.length} rows...`,
  );
  if (pendingRecipientCount < recipientCount) {
    console.log(`${recipientCount - pendingRecipientCount} accepted recipients were skipped.`);
  }

  const summary = await sendCsvEmailBatch({
    provider,
    sender: environment.sender,
    replyTo: environment.replyTo,
    rows,
    onRowComplete: async (row, delivery) => {
      ledger.recordAccepted(row, ledgerContext, delivery.summary);
      await ledgerStore.save(ledger);
    },
  });

  console.log(
    `Finished: ${summary.acceptedCount} accepted, ${summary.failedCount} not accepted.`,
  );

  if (summary.failedCount > 0) {
    for (const row of summary.rows.filter(
      (delivery) => delivery.summary.failedCount > 0,
    )) {
      console.error(
        `Row ${row.rowNumber}: ${row.summary.failedCount} recipient(s) not accepted.`,
      );
    }
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  if (error instanceof CsvInputError) {
    console.error(error.message);
  } else if (error instanceof EnvironmentConfigurationError) {
    console.error("SMTP environment variables are missing or invalid.");
  } else if (error instanceof CsvDeliveryLedgerError) {
    console.error(
      "The CSV delivery ledger is invalid. Restore it or rerun with --force.",
    );
  } else if (
    typeof error === "object" &&
    error !== null &&
    Reflect.get(error, "code") === "ENOENT"
  ) {
    console.error("CSV file not found in the data folder.");
  } else {
    console.error("The CSV send could not be completed.");
  }

  process.exitCode = 1;
});
