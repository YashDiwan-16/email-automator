import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import {
  CsvInputError,
  parseEmailCsv,
  sendCsvEmailBatch,
} from "../lib/email/csv-email-source";
import { createNodemailerEmailProvider } from "../lib/email/nodemailer-provider";
import {
  EnvironmentConfigurationError,
  getEmailRuntimeConfiguration,
} from "../lib/email/runtime-config";
import { PREDEFINED_EMAIL_TEMPLATE } from "../lib/email/template";

function resolveCsvPath(argument: string | undefined): string {
  if (!argument) {
    throw new CsvInputError("Usage: pnpm send <file.csv>");
  }

  const filename = argument.endsWith(".csv") ? argument : `${argument}.csv`;
  if (path.basename(filename) !== filename) {
    throw new CsvInputError("CSV files must be selected by name from the data folder.");
  }

  return path.join(process.cwd(), "data", filename);
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());

  const csvPath = resolveCsvPath(process.argv[2]);
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

  const environment = getEmailRuntimeConfiguration();
  const provider = createNodemailerEmailProvider(environment.smtp);
  const recipientCount = parsed.rows.reduce(
    (count, row) => count + row.to.length + row.cc.length + row.bcc.length,
    0,
  );

  console.log(
    `Sending template "${PREDEFINED_EMAIL_TEMPLATE.subject}" to ${recipientCount} recipients across ${parsed.rows.length} rows...`,
  );

  const summary = await sendCsvEmailBatch({
    provider,
    sender: environment.sender,
    replyTo: environment.replyTo,
    rows: parsed.rows,
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
