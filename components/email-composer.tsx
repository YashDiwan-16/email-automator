"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  type Ref,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  type Control,
  Controller,
  useForm,
  useWatch,
} from "react-hook-form";

import { sendEmail } from "@/app/actions/send-email";
import {
  emailComposerSchema,
  type EmailComposerField,
  type EmailComposerInput,
  MAX_RECIPIENTS,
  normalizeAddressGroups,
  parseAddressList,
  tokenizeAddressList,
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
  control: Control<EmailComposerInput>;
  description: string;
  disabled: boolean;
  error?: string;
  label: string;
  name: "to" | "cc" | "bcc";
  placeholder: string;
  required?: boolean;
}

interface RecipientChipInputProps {
  describedBy: string;
  disabled: boolean;
  hasError: boolean;
  id: string;
  inputRef: Ref<HTMLInputElement>;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}

function normalizeChip(candidate: string): string {
  const parsed = parseAddressList(candidate);
  return parsed.invalidAddresses.length === 0 && parsed.addresses.length === 1
    ? (parsed.addresses[0] as string)
    : candidate.trim();
}

function isValidChip(candidate: string): boolean {
  const parsed = parseAddressList(candidate);
  return parsed.invalidAddresses.length === 0 && parsed.addresses.length === 1;
}

function mergeChips(existing: string[], candidates: string[]): string[] {
  const merged = [...existing];
  const seen = new Set(
    existing.map((candidate) => candidate.toLocaleLowerCase("en-US")),
  );

  for (const candidate of candidates.map(normalizeChip).filter(Boolean)) {
    const key = candidate.toLocaleLowerCase("en-US");
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(candidate);
    }
  }

  return merged;
}

function RecipientChipInput({
  describedBy,
  disabled,
  hasError,
  id,
  inputRef,
  onBlur,
  onChange,
  placeholder,
  value,
}: RecipientChipInputProps) {
  const [draft, setDraft] = useState("");
  const chips = useMemo(() => tokenizeAddressList(value), [value]);

  function updateChips(nextChips: string[]): void {
    onChange(nextChips.join(", "));
  }

  function addChips(candidates: string[]): void {
    updateChips(mergeChips(chips, candidates));
  }

  function commitDraft(): void {
    const candidates = tokenizeAddressList(draft);
    if (candidates.length > 0) {
      addChips(candidates);
    }
    setDraft("");
  }

  function handleDraftChange(nextDraft: string): void {
    if (!/[,;\r\n]/u.test(nextDraft)) {
      setDraft(nextDraft);
      return;
    }

    const pieces = nextDraft.split(/[,;\r\n]/u);
    const endsWithSeparator = /[,;\r\n]\s*$/u.test(nextDraft);
    const remainder = endsWithSeparator ? "" : (pieces.pop() ?? "");
    addChips(pieces);
    setDraft(remainder.trimStart());
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (
      event.key === "Enter" ||
      event.key === "," ||
      event.key === ";" ||
      event.key === "Tab"
    ) {
      if (draft.trim()) {
        if (event.key !== "Tab") {
          event.preventDefault();
        }
        commitDraft();
      }
      return;
    }

    if (event.key === "Backspace" && !draft && chips.length > 0) {
      updateChips(chips.slice(0, -1));
    }
  }

  function removeChip(index: number): void {
    updateChips(chips.filter((_, chipIndex) => chipIndex !== index));
  }

  return (
    <div
      className={`mt-2 flex min-h-13 w-full flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-2 shadow-sm outline-none transition focus-within:ring-4 disabled:bg-slate-50 ${
        hasError
          ? "border-red-300 focus-within:border-red-400 focus-within:ring-red-500/10"
          : "border-slate-200 hover:border-slate-300 focus-within:border-violet-500 focus-within:ring-violet-500/10"
      } ${disabled ? "cursor-not-allowed bg-slate-50" : ""}`}
    >
      {chips.map((chip, index) => {
        const isValid = isValidChip(chip);

        return (
          <span
            key={`${chip.toLocaleLowerCase("en-US")}-${index}`}
            className={`inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1.5 text-sm font-medium ring-1 ${
              isValid
                ? "bg-violet-50 text-violet-800 ring-violet-200"
                : "bg-red-50 text-red-800 ring-red-200"
            }`}
            title={isValid ? chip : "Invalid email address"}
          >
            <span className="max-w-60 truncate">{chip}</span>
            <button
              type="button"
              aria-label={`Remove ${chip}`}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-base leading-none transition ${
                isValid
                  ? "text-violet-500 hover:bg-violet-200 hover:text-violet-900"
                  : "text-red-500 hover:bg-red-200 hover:text-red-900"
              }`}
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => removeChip(index)}
            >
              <span aria-hidden="true">×</span>
            </button>
          </span>
        );
      })}
      <input
        ref={inputRef}
        id={id}
        type="email"
        inputMode="email"
        autoComplete="off"
        aria-describedby={describedBy}
        aria-invalid={hasError}
        className="min-h-8 min-w-36 flex-1 border-0 bg-transparent px-1 text-[15px] text-slate-950 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        disabled={disabled}
        placeholder={chips.length > 0 ? "Add another…" : placeholder}
        value={draft}
        onBlur={() => {
          commitDraft();
          onBlur();
        }}
        onChange={(event) => handleDraftChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

function AddressField({
  control,
  description,
  disabled,
  error,
  label,
  name,
  placeholder,
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
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <RecipientChipInput
            describedBy={`${helpId}${error ? ` ${errorId}` : ""}`}
            disabled={disabled}
            hasError={Boolean(error)}
            id={name}
            inputRef={field.ref}
            placeholder={placeholder}
            value={field.value}
            onBlur={field.onBlur}
            onChange={field.onChange}
          />
        )}
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
              control={control}
              required
              name="to"
              label="To"
              description="Visible to every recipient. Press Enter or type a comma after each address."
              placeholder="alex@example.com"
              disabled={isPending}
              error={errors.to?.message}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <AddressField
                control={control}
                name="cc"
                label="CC"
                description="Visible in the message headers. Paste or enter multiple addresses."
                placeholder="manager@example.com"
                disabled={isPending}
                error={errors.cc?.message}
              />
              <AddressField
                control={control}
                name="bcc"
                label="BCC"
                description="Hidden from other recipients. Paste or enter multiple addresses."
                placeholder="audit@example.com"
                disabled={isPending}
                error={errors.bcc?.message}
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
