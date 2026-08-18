"use client";

import { useEffect, useRef } from "react";

interface SendConfirmationDialogProps {
  bccCount: number;
  ccCount: number;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  toCount: number;
}

function formatAddressCount(count: number, label: string): string {
  return `${count} ${label} ${count === 1 ? "address" : "addresses"}`;
}

export function SendConfirmationDialog({
  bccCount,
  ccCount,
  isOpen,
  onCancel,
  onConfirm,
  toCount,
}: SendConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-describedby="send-confirmation-description"
      aria-labelledby="send-confirmation-title"
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-3xl border border-black/10 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="p-6 sm:p-7">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
          <svg
            aria-hidden="true"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="m4 4 16 8-16 8 3-8-3-8Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path d="M7 12h13" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </div>
        <h2
          id="send-confirmation-title"
          className="text-xl font-semibold tracking-[-0.02em]"
        >
          Send one email to {toCount + ccCount + bccCount} recipients?
        </h2>
        <p
          id="send-confirmation-description"
          className="mt-2 text-sm leading-6 text-slate-600"
        >
          Every recipient can see {formatAddressCount(toCount, "To")} and{" "}
          {formatAddressCount(ccCount, "CC")} in the message headers. The{" "}
          {formatAddressCount(bccCount, "BCC")} will remain hidden. The configured
          template will be sent exactly as defined in code.
        </p>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            autoFocus
            type="button"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
            onClick={onCancel}
          >
            Review recipients
          </button>
          <button
            type="button"
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
            onClick={onConfirm}
          >
            Yes, send email
          </button>
        </div>
      </div>
    </dialog>
  );
}
