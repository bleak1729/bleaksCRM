import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Pill shape como en referencia (border-radius: 20px)
  "inline-flex items-center px-2.5 py-[3px] text-[12px] font-semibold transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default:     "rounded-full bg-[var(--ac-tint)] text-[var(--ac)]",
        success:     "rounded-full bg-[var(--success-bg)] text-[var(--success)]",
        danger:      "rounded-full bg-[var(--danger-bg)] text-[var(--danger)]",
        warning:     "rounded-full bg-[var(--warning-bg)] text-[var(--warning)]",
        neutral:     "rounded-full bg-[var(--neutral-bg)] text-[var(--neutral)]",
        outline:     "rounded-full border border-[var(--bor2)] text-[var(--txt2)]",
        secondary:   "rounded-full bg-[var(--bg3)] text-[var(--txt2)]",
        destructive: "rounded-full bg-[var(--danger-bg)] text-[var(--danger)]",
        // aliases para LeadTable
        amber:       "rounded-full bg-[var(--warning-bg)] text-[var(--warning)]",
        rust:        "rounded-full bg-[var(--danger-bg)] text-[var(--danger)]",
        green:       "rounded-full bg-[var(--success-bg)] text-[var(--success)]",
        muted:       "rounded-full bg-[var(--neutral-bg)] text-[var(--neutral)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
