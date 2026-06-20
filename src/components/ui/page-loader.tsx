import React from "react";

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#090d10]">
      <div
        role="status"
        aria-label="Loading"
        className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"
      >
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
