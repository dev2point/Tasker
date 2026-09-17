import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { BorderBeam } from "@/components/magicui/border-beam"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98] relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-emerald-500 text-white font-bold shadow-md hover:bg-emerald-400 hover:shadow-emerald-500/20 border border-emerald-400/50 active:bg-emerald-600",
        destructive:
          "bg-rose-600 text-white shadow-sm hover:bg-rose-500 hover:shadow-rose-500/30 border border-rose-500/40 active:bg-rose-700",
        outline:
          "border border-emerald-500/30 bg-[#082219]/90 text-emerald-200 shadow-xs hover:bg-emerald-500/20 hover:text-white hover:border-emerald-500/50 active:bg-emerald-500/30",
        secondary:
          "bg-[#082219] text-slate-200 border border-emerald-500/20 shadow-xs hover:bg-emerald-500/20 hover:text-white active:bg-emerald-500/30",
        ghost:
          "text-slate-300 hover:bg-emerald-500/20 hover:text-white active:bg-emerald-500/30",
        link:
          "text-emerald-400 underline-offset-4 hover:underline",
        soft:
          "bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/80 active:bg-emerald-800/80 border border-emerald-500/30",
        success:
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 hover:shadow-emerald-500/20 border border-emerald-400/50",
        warning:
          "bg-amber-500 text-white shadow-sm hover:bg-amber-400 hover:shadow-amber-500/20 border border-amber-400/50",
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
  ({ className, variant, size, showBorderBeam = true, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
        {showBorderBeam && (
          <BorderBeam size={80} duration={6} colorFrom="#10b981" colorTo="#34d399" borderWidth={1} />
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
