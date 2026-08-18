"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { sendEmail } from "@/app/actions/send-email";
import {
  emailComposerSchema,
  type EmailComposerField,
  type EmailComposerInput,
  MAX_RECIPIENTS,
  parseRecipientList,
} from "@/lib/email/schema";
import type { SendEmailActionResult } from "@/types/email";

import { SendConfirmationDialog } from "./send-confirmation-dialog";

const defaultValues: EmailComposerInput = {
  accessToken: "",
  fromName: "",
  replyTo: "",
  recipients: "",
  subject: "",
  message: "",
  idempotencyKey: "",
};

const fieldNames = new Set<EmailComposerField>([
  "accessToken",
  "fromName",
  "replyTo",
  "recipients",
  "subject",
  "message",
  "idempotencyKey",
]);

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:bg-slate-50";

function createIdempotencyKey(): string {
  return window.crypto.randomUUID();
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
      ? `${result.summary.acceptedCount} accepted, ${result.summary.failedCount} failed`
      : `${result.summary.acceptedCount} ${result.summary.acceptedCount === 1 ? "email" : "emails"} accepted`;
  const summary = result.summary;

  return (
    <div
      aria-atomic="true"
      aria-live={isError ? "assertive" : "polite"}
      className={`mb-6 rounded-2xl border p-4 ${containerClasses}`}
      role={isError ? "alert" : "status"}
    >
      <div className="flex gap-3">
        <div className="mt-0.5 shrink-0">
          {isError ? (
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path d="M12 8v5m0 3h.01M10.3 4.8 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.8a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path d="m5 12 4 4L19 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {!isError && result.replayed ? (
            <p className="mt-1 text-xs opacity-75">
              A previous result was safely reused; no duplicate send occurred.
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
      </div>
    </div>
  );
}

export function EmailComposer() {
  const [isPending, startTransition] = useTransition();
  const [isTokenVisible, setIsTokenVisible] = useState(false);
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

  const recipientsValue = useWatch({ control, name: "recipients" });
  const messageValue = useWatch({ control, name: "message" });
  const recipientCount = useMemo(
    () => parseRecipientList(recipientsValue ?? "").recipients.length,
    [recipientsValue],
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
          applyServerFieldErrors(actionResult.fieldErrors);
          return;
        }

        reset({
          ...defaultValues,
          accessToken: values.accessToken,
          fromName: values.fromName,
          replyTo: values.replyTo,
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
    if (recipientCount > 1) {
      setPendingSubmission(values);
      return;
    }

    dispatchSend(values);
  });

  return (
    <>
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.22)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
              Composer
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-950">
              New message
            </h2>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Private delivery
          </div>
        </div>

        <form className="px-5 py-6 sm:px-7 sm:py-7" noValidate onSubmit={submitForm}>
          {result ? <ResultNotice result={result} /> : null}

          <div className="mb-7 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
            <label htmlFor="accessToken" className="text-sm font-semibold text-slate-900">
              Access token
            </label>
            <p id="accessToken-help" className="mt-1 text-xs leading-5 text-slate-600">
              Required for every send and never persisted by this app.
            </p>
            <div className="relative">
              <input
                id="accessToken"
                type={isTokenVisible ? "text" : "password"}
                autoComplete="current-password"
                aria-describedby={`accessToken-help${errors.accessToken ? " accessToken-error" : ""}`}
                aria-invalid={Boolean(errors.accessToken)}
                className={`${inputClassName} pr-16`}
                disabled={isPending}
                placeholder="Enter your private token"
                {...register("accessToken")}
              />
              <button
                type="button"
                aria-label={isTokenVisible ? "Hide access token" : "Show access token"}
                className="absolute right-2.5 top-1/2 mt-1 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                onClick={() => setIsTokenVisible((visible) => !visible)}
              >
                {isTokenVisible ? "Hide" : "Show"}
              </button>
            </div>
            {errors.accessToken ? (
              <p id="accessToken-error" className="mt-1.5 text-xs font-medium text-red-600">
                {errors.accessToken.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="fromName" className="text-sm font-semibold text-slate-900">From name</label>
              <input id="fromName" type="text" autoComplete="organization" aria-describedby={errors.fromName ? "fromName-error" : undefined} aria-invalid={Boolean(errors.fromName)} className={inputClassName} disabled={isPending} placeholder="Acme product team" {...register("fromName")} />
              {errors.fromName ? <p id="fromName-error" className="mt-1.5 text-xs font-medium text-red-600">{errors.fromName.message}</p> : null}
            </div>
            <div>
              <label htmlFor="replyTo" className="text-sm font-semibold text-slate-900">Reply-to address</label>
              <input id="replyTo" type="email" autoComplete="email" aria-describedby={errors.replyTo ? "replyTo-error" : undefined} aria-invalid={Boolean(errors.replyTo)} className={inputClassName} disabled={isPending} placeholder="team@example.com" {...register("replyTo")} />
              {errors.replyTo ? <p id="replyTo-error" className="mt-1.5 text-xs font-medium text-red-600">{errors.replyTo.message}</p> : null}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <label htmlFor="recipients" className="text-sm font-semibold text-slate-900">Recipients</label>
                <p id="recipients-help" className="mt-1 text-xs text-slate-500">Separate addresses with commas or new lines.</p>
              </div>
              <span aria-atomic="true" aria-live="polite" className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600" role="status">{recipientCount} / {MAX_RECIPIENTS}</span>
            </div>
            <textarea id="recipients" rows={3} aria-describedby={`recipients-help${errors.recipients ? " recipients-error" : ""}`} aria-invalid={Boolean(errors.recipients)} className={`${inputClassName} min-h-24 resize-y leading-6`} disabled={isPending} placeholder={"alex@example.com, jordan@example.com\nsam@example.com"} {...register("recipients")} />
            {errors.recipients ? <p id="recipients-error" className="mt-1.5 text-xs font-medium text-red-600">{errors.recipients.message}</p> : null}
          </div>

          <div className="mt-5">
            <label htmlFor="subject" className="text-sm font-semibold text-slate-900">Subject</label>
            <input id="subject" type="text" aria-describedby={errors.subject ? "subject-error" : undefined} aria-invalid={Boolean(errors.subject)} className={inputClassName} disabled={isPending} placeholder="What should they know?" {...register("subject")} />
            {errors.subject ? <p id="subject-error" className="mt-1.5 text-xs font-medium text-red-600">{errors.subject.message}</p> : null}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="message" className="text-sm font-semibold text-slate-900">Message</label>
              <span className="text-xs tabular-nums text-slate-400">{(messageValue ?? "").length.toLocaleString()} / 10,000</span>
            </div>
            <textarea id="message" rows={8} aria-describedby={errors.message ? "message-error" : undefined} aria-invalid={Boolean(errors.message)} className={`${inputClassName} min-h-48 resize-y leading-6`} disabled={isPending} placeholder="Write a clear, useful message…" {...register("message")} />
            {errors.message ? <p id="message-error" className="mt-1.5 text-xs font-medium text-red-600">{errors.message.message}</p> : null}
          </div>

          <input type="hidden" {...register("idempotencyKey")} />

          <div className="mt-7 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-xs leading-5 text-slate-500">
              <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24">
                <path d="M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
              </svg>
              <span>Recipients are sent separately and never exposed to each other.</span>
            </div>
            <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_-10px_rgba(124,58,237,0.8)] transition hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-violet-300 disabled:shadow-none" disabled={isPending}>
              {isPending ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24"><path d="m4 4 16 8-16 8 3-8-3-8Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" /><path d="M7 12h13" stroke="currentColor" strokeWidth="1.8" /></svg>}
              {isPending ? "Sending securely…" : `Send${recipientCount > 0 ? ` to ${recipientCount}` : ""}`}
            </button>
          </div>
        </form>
      </section>

      <SendConfirmationDialog
        isOpen={pendingSubmission !== null}
        recipientCount={recipientCount}
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
