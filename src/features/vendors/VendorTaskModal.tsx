"use client";

import React, { useState, useEffect } from "react";
import { X, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  vendorTaskFormSchema,
  type VendorTaskFormData,
} from "@/lib/schemas/vendor";
import type { VendorTask } from "@/types/vendor";

interface VendorTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: VendorTask) => void;
  initialTask?: VendorTask | null;
  vendorName: string;
}

function TaskForm({
  initialTask,
  vendorName,
  onSave,
  onClose,
}: Omit<VendorTaskModalProps, "isOpen">) {
  const isEditing = Boolean(initialTask);

  const [title, setTitle] = useState(initialTask?.title || "");
  const [description, setDescription] = useState(initialTask?.description || "");
  const [dueDate, setDueDate] = useState(initialTask?.dueDate || "");
  const [completed, setCompleted] = useState(initialTask?.completed || false);
  const [notes, setNotes] = useState(initialTask?.notes || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formData: VendorTaskFormData = {
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate.trim() || undefined,
      completed,
      notes: notes.trim() || undefined,
    };

    const parseResult = vendorTaskFormSchema.safeParse(formData);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    const savedTask: VendorTask = {
      id:
        initialTask?.id ||
        `task-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      title: formData.title,
      description: formData.description,
      dueDate: formData.dueDate,
      completed: formData.completed,
      notes: formData.notes,
    };

    onSave(savedTask);
    onClose();
  };

  return (
    <div className="relative w-full max-w-md bg-[color:var(--bg-card)] rounded-[var(--radius-lg)] border border-[color:var(--border)] shadow-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[color:var(--border)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-[color:var(--accent-primary-light)] text-[color:var(--accent-primary)]">
            <CheckSquare size={18} aria-hidden="true" />
          </div>
          <div>
            <h2
              id="vendor-task-modal-title"
              className="text-base font-bold text-[color:var(--text-primary)]"
            >
              {isEditing ? "Edit Checklist Task" : "Add Vendor Task"}
            </h2>
            <p className="text-xs text-[color:var(--text-secondary)]">
              For: <span className="font-semibold text-[color:var(--text-primary)]">{vendorName}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close task dialog"
          className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] transition-colors"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        <Input
          label="Task Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Finalize floor plan & seating chart"
          error={errors.title}
        />

        <Input
          type="date"
          label="Due Date (Optional)"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          error={errors.dueDate}
          helperText="YYYY-MM-DD"
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="task-desc"
            className="text-sm font-medium text-[color:var(--text-primary)]"
          >
            Description (Optional)
          </label>
          <textarea
            id="task-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details, delivery location, responsible contact..."
            className="w-full px-3 py-2 text-sm bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] hover:border-[color:var(--border-strong)] rounded-[var(--radius-sm)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="task-notes"
            className="text-sm font-medium text-[color:var(--text-primary)]"
          >
            Notes / Output (Optional)
          </label>
          <input
            id="task-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Confirmation reference, invoice number, or link"
            className="w-full h-10 px-3 text-sm bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] hover:border-[color:var(--border-strong)] rounded-[var(--radius-sm)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] transition-colors"
          />
        </div>

        <label className="flex items-center gap-2.5 pt-1 text-sm font-medium cursor-pointer select-none">
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
            className="w-4 h-4 rounded accent-[color:var(--success)] cursor-pointer"
          />
          <span className={completed ? "text-[color:var(--success)] font-semibold" : "text-[color:var(--text-primary)]"}>
            Mark task as completed
          </span>
        </label>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[color:var(--border)]">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {isEditing ? "Save Changes" : "Add Task"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function VendorTaskModal({
  isOpen,
  onClose,
  onSave,
  initialTask,
  vendorName,
}: VendorTaskModalProps) {
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
      aria-labelledby="vendor-task-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
    >
      <TaskForm
        key={initialTask?.id || "new"}
        initialTask={initialTask}
        vendorName={vendorName}
        onSave={onSave}
        onClose={onClose}
      />
    </div>
  );
}

