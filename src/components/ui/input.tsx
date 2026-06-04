import { cn } from "@/lib/utils"
import * as React from "react"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, style, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full px-3 py-2 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-50",
        type === "search" &&
          "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
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
  ),
)
Input.displayName = "Input"

export { Input }
