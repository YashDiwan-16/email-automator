"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { sendEmail } from "@/app/actions/send-email";
import {
  emailComposerSchema,
  type EmailComposerField,
  type EmailComposerInput,
  MAX_RECIPIENTS,
  normalizeAddressGroups,
  parseAddressList,
} from "@/lib/email/schema";
import type { SendEmailActionResult } from "@/types/email";

import { SendConfirmationDialog } from "./send-confirmation-dialog";

const defaultValues: EmailComposerInput = {
  university: "",
  to: "",
  cc: "",
  bcc: "",
  idempotencyKey: "",
};

const fieldNames = new Set<EmailComposerField>([
  "university",
  "to",
  "cc",
  "bcc",
  "idempotencyKey",
]);

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:bg-slate-50";

function createIdempotencyKey(): string {
  return window.crypto.randomUUID();
}

function countAddressGroups(to: string, cc: string, bcc: string) {
  const groups = normalizeAddressGroups({
    to: parseAddressList(to).addresses,
    cc: parseAddressList(cc).addresses,
    bcc: parseAddressList(bcc).addresses,
  });
  const toCount = groups.to.length;
  const ccCount = groups.cc.length;
  const bccCount = groups.bcc.length;

  return {
    toCount,
    ccCount,
    bccCount,
    total: toCount + ccCount + bccCount,
  };
}

function ResultNotice({ result }: { result: SendEmailActionResult }) {
  const isError = result.status === "error";
  const isPartial = result.status === "partial";
  const containerClasses = isError
    ? "border-red-200 bg-red-50 text-red-950"
    : isPartial
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : "border-emerald-200 bg-emerald-50 text-emerald-950";
  const title = isError
    ? result.message
    : isPartial
      ? `${result.summary.acceptedCount} accepted, ${result.summary.failedCount} not accepted`
      : `${result.summary.acceptedCount} ${result.summary.acceptedCount === 1 ? "recipient" : "recipients"} accepted`;
  const summary = result.summary;

  return (
    <div
      aria-atomic="true"
      aria-live={isError ? "assertive" : "polite"}
      className={`mb-6 rounded-2xl border p-4 ${containerClasses}`}
      role={isError ? "alert" : "status"}
    >
      <p className="text-sm font-semibold">{title}</p>
      {!isError && result.replayed ? (
        <p className="mt-1 text-xs opacity-75">
          A previous result was reused; no duplicate SMTP send occurred.
        </p>
      ) : null}
      {summary && summary.failedCount > 0 ? (
        <ul className="mt-2 space-y-1 text-xs opacity-80">
          {summary.recipients
            .filter((recipient) => recipient.status === "failed")
            .map((recipient) => (
              <li key={recipient.recipient} className="truncate">
                {recipient.recipient} — not accepted
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}

interface AddressFieldProps {
  description: string;
  disabled: boolean;
  error?: string;
  label: string;
  name: "to" | "cc" | "bcc";
  placeholder: string;
  register: ReturnType<typeof useForm<EmailComposerInput>>["register"];
  required?: boolean;
}

function AddressField({
  description,
  disabled,
  error,
  label,
  name,
  placeholder,
  register,
  required = false,
}: AddressFieldProps) {
  const helpId = `${name}-help`;
  const errorId = `${name}-error`;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={name} className="text-sm font-semibold text-slate-900">
          {label}
        </label>
        {!required ? (
          <span className="text-xs font-medium text-slate-400">Optional</span>
        ) : null}
      </div>
      <p id={helpId} className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
      <textarea
        id={name}
        rows={2}
        aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
        aria-invalid={Boolean(error)}
        className={`${inputClassName} min-h-20 resize-y leading-6`}
        disabled={disabled}
        placeholder={placeholder}
        {...register(name)}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function EmailComposer({ templateSubject }: { templateSubject: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingSubmission, setPendingSubmission] =
    useState<EmailComposerInput | null>(null);
  const [result, setResult] = useState<SendEmailActionResult | null>(null);
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
  } = useForm<EmailComposerInput>({
    resolver: zodResolver(emailComposerSchema, undefined, { raw: true }),
    defaultValues,
  });

  useEffect(() => {
    setValue("idempotencyKey", createIdempotencyKey());
  }, [setValue]);

  const [toValue, ccValue, bccValue] = useWatch({
    control,
    name: ["to", "cc", "bcc"],
  });
  const counts = useMemo(
    () => countAddressGroups(toValue ?? "", ccValue ?? "", bccValue ?? ""),
    [toValue, ccValue, bccValue],
  );

  function applyServerFieldErrors(
    fieldErrors: Partial<Record<string, string[]>> | undefined,
  ): void {
    for (const [field, messages] of Object.entries(fieldErrors ?? {})) {
      if (fieldNames.has(field as EmailComposerField) && messages?.[0]) {
        setError(field as EmailComposerField, {
          type: "server",
          message: messages[0],
        });
      }
    }
  }

  function dispatchSend(values: EmailComposerInput): void {
    setPendingSubmission(null);
    setResult(null);

    startTransition(async () => {
      try {
        const actionResult = await sendEmail(values);
        setResult(actionResult);

        if (actionResult.status === "error") {
          if (actionResult.code === "unauthorized") {
            router.replace("/login");
            return;
          }

          applyServerFieldErrors(actionResult.fieldErrors);
          return;
        }

        reset({
          ...defaultValues,
          idempotencyKey: createIdempotencyKey(),
        });
      } catch {
        setResult({
          status: "error",
          code: "send_failed",
          message: "The connection was interrupted. Please try again.",
        });
      }
    });
  }

  const submitForm = handleSubmit((values) => {
    setResult(null);
    setPendingSubmission(values);
  });

  return (
    <>
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.22)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
              Recipient list
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-950">
              Send predefined email
            </h2>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            SMTP ready
          </div>
        </div>

        <form
          className="px-5 py-6 sm:px-7 sm:py-7"
          noValidate
          onSubmit={submitForm}
        >
          {result ? <ResultNotice result={result} /> : null}

          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Code-managed template
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {templateSubject}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              The university is inserted into the approved EduDeca invitation.
              All other content and sender details are fixed in code.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label
                htmlFor="university"
                className="text-sm font-semibold text-slate-900"
              >
                Recipient university
              </label>
              <p
                id="university-help"
                className="mt-1 text-xs leading-5 text-slate-500"
              >
                Enter the exact official name used in the invitation, for example
                “XYZ University”. It is never guessed from the email address.
              </p>
              <input
                id="university"
                type="text"
                autoComplete="organization"
                aria-describedby={`university-help${errors.university ? " university-error" : ""}`}
                aria-invalid={Boolean(errors.university)}
                className={inputClassName}
                disabled={isPending}
                placeholder="XYZ University"
                {...register("university")}
              />
              {errors.university ? (
                <p
                  id="university-error"
                  className="mt-1.5 text-xs font-medium text-red-600"
                >
                  {errors.university.message}
                </p>
              ) : null}
            </div>
            <AddressField
              required
              name="to"
              label="To"
              description="Visible to every recipient. Separate addresses with commas, semicolons, or new lines."
              placeholder="alex@example.com; jordan@example.com"
              disabled={isPending}
              error={errors.to?.message}
              register={register}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <AddressField
                name="cc"
                label="CC"
                description="Visible in the message headers to every recipient."
                placeholder="manager@example.com"
                disabled={isPending}
                error={errors.cc?.message}
                register={register}
              />
              <AddressField
                name="bcc"
                label="BCC"
                description="Delivered without exposing these addresses."
                placeholder="audit@example.com"
                disabled={isPending}
                error={errors.bcc?.message}
                register={register}
              />
            </div>
          </div>

          <input type="hidden" {...register("idempotencyKey")} />

          <div className="mt-7 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span
                aria-atomic="true"
                aria-live="polite"
                className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold tabular-nums text-slate-600"
                role="status"
              >
                {counts.total} / {MAX_RECIPIENTS}
              </span>
              <span>unique recipients</span>
            </div>
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_-10px_rgba(124,58,237,0.8)] transition hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-violet-300 disabled:shadow-none"
              disabled={isPending}
            >
              {isPending ? (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              ) : null}
              {isPending ? "Sending…" : "Review and send"}
            </button>
          </div>
        </form>
      </section>

      <SendConfirmationDialog
        isOpen={pendingSubmission !== null}
        university={pendingSubmission?.university ?? ""}
        toCount={counts.toCount}
        ccCount={counts.ccCount}
        bccCount={counts.bccCount}
        onCancel={() => setPendingSubmission(null)}
        onConfirm={() => {
          if (pendingSubmission) {
            dispatchSend(pendingSubmission);
          }
        }}
      />
    </>
  );
}
