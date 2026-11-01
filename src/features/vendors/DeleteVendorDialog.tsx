"use client";

import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface DeleteVendorDialogProps {
  isOpen: boolean;
  vendorName: string;
  taskCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteVendorDialog({
  isOpen,
  vendorName,
  taskCount,
  onConfirm,
  onCancel,
}: DeleteVendorDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-vendor-title"
      aria-describedby="delete-vendor-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md bg-[color:var(--bg-card)] rounded-[var(--radius-lg)] border border-[color:var(--border)] shadow-xl p-6">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-full bg-[color:var(--error-light)] text-[color:var(--error)] shrink-0">
            <AlertTriangle size={22} aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <h2
              id="delete-vendor-title"
              className="text-base font-bold text-[color:var(--text-primary)]"
            >
              Delete Vendor
            </h2>
            <p
              id="delete-vendor-desc"
              className="mt-1.5 text-sm text-[color:var(--text-secondary)]"
            >
              Are you sure you want to delete &ldquo;{vendorName}&rdquo;?
              {taskCount > 0 && ` This will also delete ${taskCount} attached checklist task(s).`}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Close delete dialog"
            className="p-1 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            className="!bg-[color:var(--error)] hover:!bg-[color:var(--error)]/90 text-white"
          >
            Delete Vendor
          </Button>
        </div>
      </div>
    </div>
  );
}

