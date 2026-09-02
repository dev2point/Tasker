import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-indigo-600 text-white shadow-xs",
        secondary:
          "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200",
        destructive:
          "border-transparent bg-rose-100 text-rose-800 border border-rose-200/60",
        outline:
          "border border-slate-200 text-slate-700 bg-white",
        success:
          "border-transparent bg-emerald-100 text-emerald-800 border border-emerald-200/60",
        warning:
          "border-transparent bg-amber-100 text-amber-800 border border-amber-200/60",
        amber:
          "border-transparent bg-amber-100 text-amber-800 border border-amber-200/60",
        info:
          "border-transparent bg-sky-100 text-sky-800 border border-sky-200/60",
        purple:
          "border-transparent bg-purple-100 text-purple-800 border border-purple-200/60",
        indigo:
          "border-transparent bg-indigo-50 text-indigo-700 border border-indigo-200/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
