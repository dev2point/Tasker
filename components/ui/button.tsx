import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { BorderBeam } from "@/components/magicui/border-beam"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#004266] dark:focus-visible:ring-[#3895C9] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98] relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-[#004266] text-white font-semibold shadow-sm hover:bg-[#00314D] dark:bg-[#0E5D8A] dark:hover:bg-[#1472A6] border border-[#004266] dark:border-[#3895C9]/40",
        accent:
          "bg-[#F77F00] text-white font-bold shadow-sm hover:bg-[#DE7200] border border-[#F77F00] active:bg-[#C86600]",
        destructive:
          "bg-rose-600 text-white shadow-sm hover:bg-rose-500 border border-rose-600/80 active:bg-rose-700",
        outline:
          "border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-slate-100 shadow-2xs hover:bg-[#EDF2F7] dark:hover:bg-[#103049] hover:border-[#004266]/40 dark:hover:border-[#3895C9]/50",
        secondary:
          "bg-[#EDF2F7] dark:bg-[#103049] text-[#0B1F30] dark:text-slate-100 border border-[#D8E2EC] dark:border-[#94B8D6]/20 shadow-2xs hover:bg-[#E2EAF2] dark:hover:bg-[#163D5C]",
        ghost:
          "text-[#486075] dark:text-slate-300 hover:bg-[#004266]/8 dark:hover:bg-[#3895C9]/15 hover:text-[#004266] dark:hover:text-white",
        link:
          "text-[#004266] dark:text-[#4FA8DC] underline-offset-4 hover:underline",
        soft:
          "bg-[#004266]/10 dark:bg-[#3895C9]/15 text-[#004266] dark:text-[#7CC4EA] hover:bg-[#004266]/15 dark:hover:bg-[#3895C9]/25 border border-[#004266]/20 dark:border-[#3895C9]/30",
        success:
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 border border-emerald-500/50",
        warning:
          "bg-[#F77F00] text-white shadow-sm hover:bg-[#DE7200] border border-[#F77F00]",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-7 px-2.5 text-xs rounded-lg",
        sm: "h-8.5 px-3 text-xs rounded-lg",
        lg: "h-12 px-6 text-base rounded-2xl",
        icon: "h-9 w-9 rounded-xl",
        "icon-sm": "h-7.5 w-7.5 rounded-lg text-xs",
        "icon-lg": "h-11 w-11 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  showBorderBeam?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, showBorderBeam = false, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
        {showBorderBeam && (
          <BorderBeam size={80} duration={6} colorFrom="#004266" colorTo="#F77F00" borderWidth={1} />
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
