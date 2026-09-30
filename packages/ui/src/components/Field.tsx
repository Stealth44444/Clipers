import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

export function Field({ label, htmlFor, error, hint, count, maxLength, children }: {
  label: ReactNode;
  htmlFor?: string;
  error?: string | null;
  hint?: ReactNode;
  count?: number;
  maxLength?: number;
  children: ReactNode;
}) {
  const showMeta = error || hint || maxLength !== undefined;
  return (
    <div className="cl-field">
      <label className="cl-field__label" htmlFor={htmlFor}>{label}</label>
      {children}
      {showMeta && (
        <div className="cl-field__meta">
          {error ? <span className="cl-field__error">{error}</span> : hint ? <span>{hint}</span> : null}
          {maxLength !== undefined && <span className="cl-field__counter">{count ?? 0}/{maxLength}</span>}
        </div>
      )}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx('cl-input', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx('cl-textarea', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx('cl-select', className)} {...rest}>
      {children}
    </select>
  );
}
