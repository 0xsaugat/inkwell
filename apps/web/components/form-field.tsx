import type { InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

export const inputClassName =
  'w-full rounded-xl border border-line bg-paper-raised px-4 py-3 text-sm text-ink shadow-[0_1px_0_rgba(255,255,255,0.35)_inset] transition-colors placeholder:text-ink-soft/60 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 disabled:opacity-60'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
}

export function FormField({ label, hint, id, className, ...props }: FormFieldProps) {
  const fieldId = id ?? props.name

  return (
    <div className="space-y-2">
      <label
        htmlFor={fieldId}
        className="block text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft"
      >
        {label}
      </label>
      <input id={fieldId} className={clsx(inputClassName, className)} {...props} />
      {hint && (
        <p className="text-xs leading-5 text-ink-soft" id={`${fieldId}-hint`}>
          {hint}
        </p>
      )}
    </div>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null
  }

  return (
    <div
      role="alert"
      className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm leading-6 text-danger"
    >
      {message}
    </div>
  )
}

export function FormSuccess({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm leading-6 text-success"
    >
      {message}
    </div>
  )
}
