"use client";

import React, { useState, useEffect } from "react";
import { X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  vendorFormSchema,
  type VendorFormData,
} from "@/lib/schemas/vendor";
import {
  VENDOR_CATEGORY_DEFINITIONS,
  type BookingStatus,
  type Vendor,
  type VendorCategory,
} from "@/types/vendor";
import { createStarterVendorTasks } from "./vendorService";
import type { Currency } from "@/types/event";

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vendor: Vendor, shouldSyncBudget?: boolean) => void;
  initialVendor?: Vendor | null;
  currency: Currency;
  availableBudgetItems?: { id: string; name: string; categoryName: string }[];
}

const CATEGORY_OPTIONS = VENDOR_CATEGORY_DEFINITIONS.map((c) => ({
  value: c.id,
  label: c.name,
}));

const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "shortlisted", label: "Shortlisted" },
  { value: "contacted", label: "Contacted" },
  { value: "booked", label: "Booked (Confirmed)" },
  { value: "cancelled", label: "Cancelled" },
];

function VendorForm({
  initialVendor,
  currency,
  availableBudgetItems = [],
  onSave,
  onClose,
}: Omit<VendorModalProps, "isOpen">) {
  const isEditing = Boolean(initialVendor);

  const [name, setName] = useState(initialVendor?.name || "");
  const [category, setCategory] = useState<VendorCategory>(
    initialVendor?.category || "venue"
  );
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>(
    initialVendor?.bookingStatus || "shortlisted"
  );
  const [cost, setCost] = useState(
    initialVendor?.cost !== undefined ? String(initialVendor.cost) : ""
  );
  const [contactName, setContactName] = useState(initialVendor?.contactName || "");
  const [phone, setPhone] = useState(initialVendor?.phone || "");
  const [email, setEmail] = useState(initialVendor?.email || "");
  const [website, setWebsite] = useState(initialVendor?.website || "");
  const [notes, setNotes] = useState(initialVendor?.notes || "");
  const [budgetLineItemId, setBudgetLineItemId] = useState(
    initialVendor?.budgetLineItemId || ""
  );
  const [includeStarters, setIncludeStarters] = useState(!isEditing);
  const [syncBudget, setSyncBudget] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const budgetItemOptions = [
    { value: "", label: "-- None (Track Separately) --" },
    ...availableBudgetItems.map((item) => ({
      value: item.id,
      label: `${item.categoryName} → ${item.name}`,
    })),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const costNum = cost.trim() !== "" ? Number(cost) : undefined;

    const formData: VendorFormData = {
      name: name.trim(),
      category,
      bookingStatus,
      cost: costNum !== undefined && !isNaN(costNum) ? costNum : undefined,
      contactName: contactName.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
      notes: notes.trim() || undefined,
      budgetLineItemId: budgetLineItemId.trim() || undefined,
      includeStarterTasks: includeStarters,
    };

    const parseResult = vendorFormSchema.safeParse(formData);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    const nowIso = new Date().toISOString();
    let tasks = initialVendor?.checklist || [];

    // If new vendor and user requested starter tasks
    if (!isEditing && includeStarters) {
      tasks = createStarterVendorTasks();
    }

    const savedVendor: Vendor = {
      id:
        initialVendor?.id ||
        `vendor-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      name: formData.name,
      category: formData.category,
      bookingStatus: formData.bookingStatus,
      cost: formData.cost,
      contactName: formData.contactName,
      phone: formData.phone,
      email: formData.email,
      website: formData.website,
      notes: formData.notes,
      budgetLineItemId: formData.budgetLineItemId,
      checklist: tasks,
      createdAt: initialVendor?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    onSave(savedVendor, syncBudget && Boolean(savedVendor.budgetLineItemId));
    onClose();
  };

  return (
    <div className="relative w-full max-w-xl bg-[color:var(--bg-card)] rounded-[var(--radius-lg)] border border-[color:var(--border)] shadow-xl p-6 overflow-y-auto max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[color:var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-full bg-[color:var(--accent-primary-light)] text-[color:var(--accent-primary)]">
            <Building2 size={20} aria-hidden="true" />
          </div>
          <div>
            <h2
              id="vendor-modal-title"
              className="text-lg font-bold text-[color:var(--text-primary)]"
            >
              {isEditing ? "Edit Vendor Details" : "Add New Vendor"}
            </h2>
            <p className="text-xs text-[color:var(--text-secondary)]">
              {isEditing
                ? "Update booking status, contact info, and deliverables."
                : "Register a provider, attach deliverables, and monitor milestones."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close vendor dialog"
          className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] transition-colors"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        {/* Name */}
        <Input
          label="Vendor or Business Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Grandview Heritage Estate"
          error={errors.name}
        />

        {/* Category & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Service Category"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value as VendorCategory)}
            options={CATEGORY_OPTIONS}
            error={errors.category}
          />

          <Select
            label="Booking Status"
            required
            value={bookingStatus}
            onChange={(e) => setBookingStatus(e.target.value as BookingStatus)}
            options={STATUS_OPTIONS}
            error={errors.bookingStatus}
          />
        </div>

        {/* Cost & Contact Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="number"
            step="0.01"
            min="0"
            label={`Quoted / Agreed Cost (${currency})`}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="e.g., 4500"
            error={errors.cost}
            helperText="Leave blank if pricing is unconfirmed"
          />

          <Input
            label="Contact Person (Optional)"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="e.g., Elena Vance"
            error={errors.contactName}
          />
        </div>

        {/* Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="tel"
            label="Phone Number (Optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g., +1 555-0192"
            error={errors.phone}
          />

          <Input
            type="email"
            label="Email Address (Optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g., events@grandview.com"
            error={errors.email}
          />
        </div>

        {/* Website URL */}
        <Input
          type="text"
          label="Website URL (Optional)"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="e.g., https://grandviewweddings.com"
          error={errors.website}
        />

        {/* Budget Integration */}
        <div className="p-3.5 rounded-[var(--radius-md)] bg-[color:var(--bg-subtle)] border border-[color:var(--border)] space-y-2">
          <Select
            label="Link to Budget Line Item (Optional)"
            value={budgetLineItemId}
            onChange={(e) => setBudgetLineItemId(e.target.value)}
            options={budgetItemOptions}
            error={errors.budgetLineItemId}
          />
          <p className="text-[11px] text-[color:var(--text-muted)]">
            Associating a vendor directly links vendor quotes to your deterministic budget model without double-counting.
          </p>

          {budgetLineItemId && (
            <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={syncBudget}
                onChange={(e) => setSyncBudget(e.target.checked)}
                className="rounded accent-[color:var(--accent-primary)] cursor-pointer"
              />
              <span className="text-[color:var(--text-secondary)] font-medium">
                Update linked budget item name & actual cost quote immediately
              </span>
            </label>
          )}
        </div>

        {/* Starter Checklist Checkbox for new vendors */}
        {!isEditing && (
          <div className="p-3 rounded-[var(--radius-md)] bg-[color:var(--accent-primary-light)]/40 border border-[color:var(--accent-primary)]/20">
            <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeStarters}
                onChange={(e) => setIncludeStarters(e.target.checked)}
                className="mt-0.5 rounded accent-[color:var(--accent-primary)] cursor-pointer"
              />
              <div>
                <span className="font-semibold text-[color:var(--text-primary)] block">
                  Generate 7 starter vendor deliverables & milestone tasks
                </span>
                <span className="text-[color:var(--text-secondary)] block mt-0.5">
                  Includes quote review, scope alignment, contract signing, deposit, day-of logistics, and final payment. Editable anytime.
                </span>
              </div>
            </label>
          </div>
        )}

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="vendor-notes"
            className="text-sm font-medium text-[color:var(--text-primary)]"
          >
            Notes & Contract Terms (Optional)
          </label>
          <textarea
            id="vendor-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Package inclusions, dietary rules, overtime clauses, payment terms..."
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
            {isEditing ? "Save Changes" : "Save Vendor"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function VendorModal({
  isOpen,
  onClose,
  onSave,
  initialVendor,
  currency,
  availableBudgetItems,
}: VendorModalProps) {
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
      aria-labelledby="vendor-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
    >
      <VendorForm
        key={initialVendor?.id || "new"}
        initialVendor={initialVendor}
        currency={currency}
        availableBudgetItems={availableBudgetItems}
        onSave={onSave}
        onClose={onClose}
      />
    </div>
  );
}
