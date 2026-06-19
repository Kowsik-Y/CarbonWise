import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", type = "text", icon, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        <div className="relative w-full">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            className={`w-full bg-[#0d141a]/95 border border-white/10 hover:border-white/20 rounded-xl py-2.5 text-foreground placeholder-gray-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all duration-200 ${
              icon ? "pl-10 pr-4" : "px-4"
            } ${
              error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
            } ${className}`}
            {...props}
          />
        </div>
        {error && (
          <span className="text-xs font-medium text-red-400 mt-0.5">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
