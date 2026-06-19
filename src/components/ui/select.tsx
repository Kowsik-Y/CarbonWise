import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  label?: string;
  options: Option[];
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  error?: string;
  className?: string;
  openDirection?: "up" | "down";
}

export const Select: React.FC<SelectProps> = ({
  id,
  label,
  options,
  value,
  onChange,
  error,
  className = "",
  openDirection = "down",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  const handleSelect = (val: string) => {
    if (onChange) {
      onChange({ target: { value: val } });
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown" && isOpen) {
      e.preventDefault();
      const currentIndex = options.findIndex((opt) => opt.value === value);
      const nextIndex = (currentIndex + 1) % options.length;
      handleSelect(options[nextIndex].value);
    } else if (e.key === "ArrowUp" && isOpen) {
      e.preventDefault();
      const currentIndex = options.findIndex((opt) => opt.value === value);
      const prevIndex = (currentIndex - 1 + options.length) % options.length;
      handleSelect(options[prevIndex].value);
    }
  };

  const selectId = id || "custom-select";

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          id={selectId}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={`${selectId}-listbox`}
          className={`w-full flex items-center justify-between bg-[#0d141a]/95 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-left cursor-pointer transition-all duration-200 ${
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
          }`}
        >
          <span className="truncate">{selectedOption?.label || "Select..."}</span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div 
            id={`${selectId}-listbox`}
            role="listbox"
            aria-label={label || "Select option"}
            className={`absolute z-50 w-full bg-[#0d141a] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in max-h-60 overflow-y-auto no-scrollbar backdrop-blur-xl ${
              openDirection === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"
            }`}
          >
            <div className="py-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs transition-colors text-left hover:bg-brand/10 hover:text-brand-light ${
                    opt.value === value ? "bg-brand/5 text-brand font-semibold" : "text-gray-300"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && <Check className="h-3.5 w-3.5 text-brand" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && (
        <span className="text-xs font-medium text-red-400 mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
};
Select.displayName = "Select";
