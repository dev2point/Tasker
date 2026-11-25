import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9] focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EA] border border-[#004266]/20 dark:border-[#3895C9]/35 font-semibold",
        secondary:
          "bg-[#EDF2F7] dark:bg-[#103049] text-[#486075] dark:text-slate-300 border border-[#D8E2EC] dark:border-[#94B8D6]/20",
        destructive:
          "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/35",
        outline:
          "border border-[#D8E2EC] dark:border-[#94B8D6]/25 text-[#0B1F30] dark:text-slate-200 bg-white dark:bg-[#0B2438]",
        success:
          "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/35",
        emerald:
          "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/35",
        warning:
          "bg-[#FFF4E8] dark:bg-[#F77F00]/15 text-[#B45309] dark:text-[#FFB35C] border border-[#F77F00]/30",
        orange:
          "bg-[#FFF4E8] dark:bg-[#F77F00]/15 text-[#B45309] dark:text-[#FFB35C] border border-[#F77F00]/30",
        amber:
          "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/35",
        info:
          "bg-[#EBF4FA] dark:bg-[#004266]/50 text-[#004266] dark:text-[#7CC4EA] border border-[#004266]/20 dark:border-[#3895C9]/35",
        purple:
          "bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-500/35",
        indigo:
          "bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EA] border border-[#004266]/20 dark:border-[#3895C9]/35",
        primary:
          "bg-[#FFF4E8] dark:bg-[#F77F00]/20 text-[#B45309] dark:text-[#FFB35C] border border-[#F77F00]/35 font-bold",
        apricot:
          "bg-[#FFF4E8] dark:bg-[#F77F00]/20 text-[#B45309] dark:text-[#FFB35C] border border-[#F77F00]/35 font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
