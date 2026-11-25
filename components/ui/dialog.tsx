'use client';

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  showClose?: boolean
  maxWidth?: string
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  children,
  className,
  title,
  description,
  showClose = true,
  maxWidth = "max-w-lg",
}) => {
  // Lock body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // ESC key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Modal / Bottom Drawer Container */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative z-10 w-full bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-slate-100 shadow-2xl rounded-t-3xl sm:rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 overflow-hidden max-h-[92vh] sm:max-h-[85vh] flex flex-col",
              maxWidth,
              className
            )}
          >
            {/* Mobile drag handle indicator */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.2 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Header if title is present */}
            {(title || showClose) && (
              <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 shrink-0">
                <div>
                  {title && (
                    <h2 className="text-base sm:text-lg font-bold text-[#0B1F30] dark:text-slate-100 leading-tight">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="text-xs text-[#486075] dark:text-slate-400 mt-0.5">{description}</p>
                  )}
                </div>
                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-[#486075] hover:text-[#0B1F30] hover:bg-[#EDF2F7] dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-[#103049] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span className="sr-only">Fermer</span>
                  </button>
                )}
              </div>
            )}

            {/* Content with smooth scroll */}
            <div className="overflow-y-auto p-5 sm:p-6 overscroll-contain flex-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
