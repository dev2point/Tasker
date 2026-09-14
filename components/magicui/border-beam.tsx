import { cn } from "@/lib/utils";
import React from "react";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export const BorderBeam = ({
  className,
  size = 200,
  duration = 8,
  borderWidth = 1.5,
  colorFrom = "#F7C59F",
  colorTo = "#EE8D4B",
  delay = 0,
}: BorderBeamProps) => {
  return (
    <div
      className={cn(
        "absolute inset-0 rounded-[inherit] pointer-events-none overflow-hidden z-10",
        className
      )}
      style={{
        padding: `${borderWidth}px`,
        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      } as React.CSSProperties}
    >
      <div
        className="absolute -inset-[150%] animate-border-beam-spin"
        style={{
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, ${colorFrom} 40deg, ${colorTo} 90deg, transparent 140deg, transparent 360deg)`,
        }}
      />
    </div>
  );
};
