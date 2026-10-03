'use client';

import { useId, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dialog, type ButtonVariant } from '@clipers/ui';

export type ActionResult = { ok: true } | { ok: false; message: string };

/** A trigger button that opens a small form dialog, runs `onSubmit`, then refreshes the server data. */
export default function ActionDialog({ trigger, triggerVariant = 'secondary', title, submitLabel, submitVariant = 'primary', cancelLabel = '취소', canSubmit, onSubmit, children }: {
  trigger: string;
  triggerVariant?: ButtonVariant;
  title: string;
  submitLabel: string;
  submitVariant?: ButtonVariant;
  /** The button that closes without submitting; rename it when the action itself is a cancellation. */
  cancelLabel?: string;
  canSubmit: boolean;
  onSubmit: () => Promise<ActionResult>;
  children: ReactNode;
}) {
  const router = useRouter();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const result = await onSubmit();
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" variant={triggerVariant}>
        {trigger}
      </Button>
      <Dialog
        footer={
          <>
            <Button onClick={() => setOpen(false)} variant="secondary">
              {cancelLabel}
            </Button>
            <Button disabled={submitting || !canSubmit} form={formId} type="submit" variant={submitVariant}>
              {submitting ? '처리 중…' : submitLabel}
            </Button>
          </>
        }
        onClose={() => setOpen(false)}
        open={open}
        title={title}
      >
        <form className="cl-auth__form" id={formId} onSubmit={submit}>
          {children}
          {error && (
            <p className="cl-alert cl-tone-tomato" role="alert">
              {error}
            </p>
          )}
        </form>
      </Dialog>
    </>
  );
}
