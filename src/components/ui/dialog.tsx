import React, { useEffect, useRef } from "react";
import { X, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Button } from "./button";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  variant?: "success" | "error" | "info" | "warning";
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  confirmText = "OK",
  cancelText,
  onConfirm,
  variant = "info",
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-brand" />;
      case "error":
        return <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />;
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-500 animate-pulse" />;
      case "info":
      default:
        return <Info className="h-6 w-6 text-blue-400" />;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d141a]/95 backdrop-blur-xl p-6 shadow-2xl animate-scale-in flex flex-col gap-4 relative overflow-hidden">
        {/* Decorative corner glow */}
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-brand/10 rounded-full blur-xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white leading-6 truncate">{title}</h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed whitespace-pre-wrap">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Actions Footer */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
          {cancelText && (
            <Button variant="outline" size="sm" onClick={onClose}>
              {cancelText}
            </Button>
          )}
          <Button
            variant={variant === "error" || variant === "warning" ? "danger" : "primary"}
            size="sm"
            onClick={() => {
              if (onConfirm) {
                onConfirm();
              } else {
                onClose();
              }
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
Dialog.displayName = "Dialog";
