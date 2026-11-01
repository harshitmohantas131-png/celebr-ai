"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { expenseFormSchema, type ExpenseFormData } from "@/lib/schemas/budget";
import { STANDARD_BUDGET_CATEGORIES } from "./calculator";
import type { BudgetLineItem, BudgetPriority, Currency, PaymentStatus } from "@/types/event";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: BudgetLineItem) => void;
  initialExpense?: BudgetLineItem | null;
  currency: Currency;
  existingCategories: { id: string; name: string }[];
}

const PRIORITY_OPTIONS = [
  { value: "high", label: "High Priority" },
  { value: "medium", label: "Medium Priority" },
  { value: "low", label: "Low Priority" },
];

const PAYMENT_OPTIONS = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "paid", label: "Fully Paid" },
];

export function ExpenseModal(props: ExpenseModalProps) {
  if (!props.isOpen) return null;
  return (
    <ExpenseModalForm
      key={props.initialExpense?.id || "new-expense"}
      {...props}
    />
  );
}

function ExpenseModalForm({
  onClose,
  onSave,
  initialExpense,
  currency,
  existingCategories,
}: ExpenseModalProps) {
  const isEditing = Boolean(initialExpense);

  // Merge standard categories and existing custom categories
  const categoryOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of STANDARD_BUDGET_CATEGORIES) {
      map.set(c.id, c.name);
    }
    for (const ec of existingCategories) {
      map.set(ec.id, ec.name);
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [existingCategories]);

  const defaultCategoryId = initialExpense?.categoryId || categoryOptions[0]?.value || "cat-venue";

  const [name, setName] = useState(initialExpense?.name || "");
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [estimatedCost, setEstimatedCost] = useState(
    initialExpense?.estimatedCost !== undefined ? String(initialExpense.estimatedCost) : ""
  );
  const [actualCost, setActualCost] = useState(
    initialExpense?.actualCost !== undefined && initialExpense?.actualCost !== null
      ? String(initialExpense.actualCost)
      : ""
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    initialExpense?.paymentStatus || "unpaid"
  );
  const [priority, setPriority] = useState<BudgetPriority>(initialExpense?.priority || "medium");
  const [vendorName, setVendorName] = useState(initialExpense?.vendorName || "");
  const [dueDate, setDueDate] = useState(initialExpense?.dueDate || "");
  const [notes, setNotes] = useState(initialExpense?.notes || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const estNum = Number(estimatedCost);
    const actNum = actualCost.trim() !== "" ? Number(actualCost) : undefined;

    const formData: ExpenseFormData = {
      name: name.trim(),
      categoryId,
      estimatedCost: isNaN(estNum) ? -1 : estNum,
      actualCost: actNum !== undefined && !isNaN(actNum) ? actNum : undefined,
      paymentStatus,
      priority,
      vendorName: vendorName.trim() || undefined,
      dueDate: dueDate.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    const parseResult = expenseFormSchema.safeParse(formData);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    const savedExpense: BudgetLineItem = {
      id:
        initialExpense?.id ||
        `exp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      name: formData.name,
      categoryId: formData.categoryId,
      estimatedCost: formData.estimatedCost,
      actualCost: formData.actualCost,
      paymentStatus: formData.paymentStatus,
      priority: formData.priority,
      vendorName: formData.vendorName,
      dueDate: formData.dueDate,
      notes: formData.notes,
      currency,
    };

    onSave(savedExpense);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg bg-[color:var(--bg-card)] rounded-[var(--radius-lg)] border border-[color:var(--border)] shadow-xl p-6 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[color:var(--border)]">
          <h2
            id="expense-modal-title"
            className="text-lg font-bold text-[color:var(--text-primary)]"
          >
            {isEditing ? "Edit Expense Item" : "Add Budget Expense"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close expense dialog"
            className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <Input
            label="Expense Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Grand Ballroom Venue Rental"
            error={errors.name}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Expense Category"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={categoryOptions}
              error={errors.categoryId}
            />

            <Select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as BudgetPriority)}
              options={PRIORITY_OPTIONS}
              error={errors.priority}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              step="0.01"
              min="0"
              label={`Estimated Cost (${currency})`}
              required
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="e.g., 5000"
              error={errors.estimatedCost}
              helperText="Target planning figure"
            />

            <Input
              type="number"
              step="0.01"
              min="0"
              label={`Actual Cost (${currency})`}
              value={actualCost}
              onChange={(e) => setActualCost(e.target.value)}
              placeholder="Leave blank if unknown"
              error={errors.actualCost}
              helperText="Final quote or invoice total"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Payment Status"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              options={PAYMENT_OPTIONS}
              error={errors.paymentStatus}
            />

            <Input
              type="date"
              label="Payment Due Date (Optional)"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              error={errors.dueDate}
              helperText="YYYY-MM-DD"
            />
          </div>

          <Input
            label="Vendor Name (Optional)"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="e.g., Napa Valley Estates LLC"
            error={errors.vendorName}
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="expense-notes"
              className="text-sm font-medium text-[color:var(--text-primary)]"
            >
              Notes & Contract Terms (Optional)
            </label>
            <textarea
              id="expense-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Deposit terms, inclusions, cancellation policy..."
              className="w-full px-3 py-2 text-sm bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] hover:border-[color:var(--border-strong)] rounded-[var(--radius-sm)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] transition-colors"
            />
            {errors.notes && (
              <p className="text-xs text-[color:var(--error)]" role="alert">
                {errors.notes}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[color:var(--border)]">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {isEditing ? "Save Changes" : "Add Expense"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

