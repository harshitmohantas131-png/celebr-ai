"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatBudgetAmount } from "@/lib/utils";
import type { Currency } from "@/types/event";

interface ContingencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRate: number; // e.g. 0.10 for 10%
  categorySubtotal: number;
  currency: Currency;
  onSave: (newRate: number) => void;
}

const PRESET_RATES = [0.05, 0.1, 0.15, 0.2];

function ContingencyForm({
  currentRate,
  categorySubtotal,
  currency,
  onSave,
  onClose,
}: Omit<ContingencyModalProps, "isOpen">) {
  const [rate, setRate] = useState(currentRate);

  const currentPercent = Math.round(rate * 100);
  const calculatedReserve = Math.round(categorySubtotal * rate * 100) / 100;

  const handleSave = () => {
    onSave(rate);
    onClose();
  };

  return (
    <div className="relative w-full max-w-md bg-[color:var(--bg-card)] rounded-[var(--radius-lg)] border border-[color:var(--border)] shadow-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[color:var(--border)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-[color:var(--gold-light)] text-[color:var(--gold)]">
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          <h2
            id="contingency-modal-title"
            className="text-lg font-bold text-[color:var(--text-primary)]"
          >
            Adjust Contingency Reserve
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close contingency dialog"
          className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] transition-colors"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="py-4 space-y-5">
        <p className="text-xs sm:text-sm text-[color:var(--text-secondary)]">
          A contingency cushion protects your celebration against surprise expenses, overtime vendor charges, and market fluctuations.
        </p>

        {/* Preset Buttons */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-secondary)] block mb-2">
            Recommended Presets:
          </span>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_RATES.map((preset) => {
              const percent = Math.round(preset * 100);
              const isSelected = Math.abs(rate - preset) < 0.001;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRate(preset)}
                  className={[
                    "py-2 px-3 text-xs font-bold rounded-[var(--radius-sm)] border transition-all focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)]",
                    isSelected
                      ? "bg-[color:var(--gold)] text-white border-[color:var(--gold)] shadow-xs"
                      : "bg-[color:var(--bg-subtle)] text-[color:var(--text-primary)] border-[color:var(--border)] hover:bg-[color:var(--bg-muted)]",
                  ].join(" ")}
                >
                  {percent}%
                </button>
              );
            })}
          </div>
        </div>

        {/* Slider & Custom Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <label htmlFor="contingency-slider" className="text-[color:var(--text-secondary)]">
              Custom Reserve Percentage:
            </label>
            <span className="font-bold text-sm text-[color:var(--gold)]">{currentPercent}%</span>
          </div>
          <input
            id="contingency-slider"
            type="range"
            min="0"
            max="50"
            step="1"
            value={currentPercent}
            onChange={(e) => setRate(Number(e.target.value) / 100)}
            className="w-full accent-[color:var(--gold)] cursor-pointer"
          />
        </div>

        {/* Live Impact Preview */}
        <div className="p-4 rounded-[var(--radius-md)] bg-[color:var(--gold-light)]/40 border border-[color:var(--gold)]/30 space-y-2 text-xs">
          <div className="flex justify-between text-[color:var(--text-secondary)]">
            <span>Category Expenses Subtotal:</span>
            <span className="font-medium text-[color:var(--text-primary)]">
              {formatBudgetAmount(categorySubtotal, currency)}
            </span>
          </div>
          <div className="flex justify-between font-bold text-sm text-[color:var(--gold)]">
            <span>Reserve Cushion Amount ({currentPercent}%):</span>
            <span>{formatBudgetAmount(calculatedReserve, currency)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[color:var(--border)]">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="primary" onClick={handleSave}>
          Apply Reserve ({currentPercent}%)
        </Button>
      </div>
    </div>
  );
}

export function ContingencyModal({
  isOpen,
  onClose,
  currentRate,
  categorySubtotal,
  currency,
  onSave,
}: ContingencyModalProps) {
  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contingency-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
    >
      <ContingencyForm
        key={currentRate}
        currentRate={currentRate}
        categorySubtotal={categorySubtotal}
        currency={currency}
        onSave={onSave}
        onClose={onClose}
      />
    </div>
  );
}
