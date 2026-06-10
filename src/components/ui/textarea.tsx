import * as React from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, style, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full px-3 py-2 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-50 resize-vertical",
        className,
      )}
      style={{
        background:   'var(--bg)',
        border:       '1px solid var(--bor2)',
        borderRadius: 'var(--r2)',
        color:        'var(--txt)',
        fontFamily:   'var(--fb)',
        transition:   'border-color .15s, box-shadow .15s',
        ...style,
      }}
      onFocus={e  => { e.currentTarget.style.borderColor = 'var(--ac)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,90,112,.12)' }}
      onBlur={e   => { e.currentTarget.style.borderColor = 'var(--bor2)'; e.currentTarget.style.boxShadow = 'none' }}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export { Textarea }
