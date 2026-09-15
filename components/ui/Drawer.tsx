"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Right-side slide-over drawer.
 * Uses a native <dialog> element with Tailwind transitions.
 * Traps focus and closes on Escape or backdrop click.
 */
export function Drawer({ open, onClose, title, children, className }: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      // showModal() enables native focus trapping & Escape handling
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  // Close when clicking the ::backdrop pseudo-element
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleDialogClick}
      className={cn(
        // Reset dialog defaults
        "p-0 m-0 border-0 max-h-full h-full",
        // Position right side
        "ml-auto w-full max-w-xl",
        // Background & shadow
        "bg-white dark:bg-slate-900 shadow-2xl",
        // Backdrop styling via CSS
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm",
        // Slide-in animation handled via open attribute
        "open:animate-none",
        className
      )}
      style={{
        // Remove the default browser outline on dialog
        outline: "none",
      }}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          {title && (
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate pr-4">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </dialog>
  );
}
