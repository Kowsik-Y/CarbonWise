import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  premium?: boolean;
  interactive?: boolean;
  children: React.ReactNode;
}

export function GlassCard({
  premium = false,
  interactive = false,
  children,
  className = "",
  ...props
}: GlassCardProps) {
  return (
    <div
      className={`rounded-2xl p-6 ${
        premium ? "glass-premium" : "glass"
      } ${
        interactive ? "glass-interactive cursor-pointer" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
