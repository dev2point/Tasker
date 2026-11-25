import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#061826]/70 px-3.5 py-2.5 text-sm text-[#0B1F30] dark:text-slate-100 placeholder:text-[#64748B] dark:placeholder:text-slate-400 focus:outline-hidden focus:border-[#004266] dark:focus:border-[#3895C9] focus:ring-2 focus:ring-[#004266]/20 dark:focus:ring-[#3895C9]/30 disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-2xs resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
