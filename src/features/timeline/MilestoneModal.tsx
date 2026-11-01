"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { milestoneFormSchema, type MilestoneFormData } from "@/lib/schemas/timeline";
import { daysBetween, isValidCalendarDate } from "@/lib/utils/date";
import type { MilestonePriority, MilestoneStatus, TimelineMilestone } from "@/types/event";

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (milestone: TimelineMilestone) => void;
  initialMilestone?: TimelineMilestone | null;
  eventDate: string;
}

const CATEGORY_OPTIONS = [
  { value: "Venue & Ceremony", label: "Venue & Ceremony" },
  { value: "Catering & Media", label: "Catering & Media" },
  { value: "Guest Coordination", label: "Guest Coordination" },
  { value: "Decor & Styling", label: "Decor & Styling" },
  { value: "Logistics", label: "Logistics" },
  { value: "Entertainment", label: "Entertainment" },
  { value: "Invitations & Attire", label: "Invitations & Attire" },
  { value: "Day-Of Planning", label: "Day-Of Planning" },
  { value: "Rehearsal", label: "Rehearsal" },
  { value: "Day-Of", label: "Day-Of" },
  { value: "General", label: "General" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "High Priority" },
  { value: "medium", label: "Medium Priority" },
  { value: "low", label: "Low Priority" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function MilestoneModal(props: MilestoneModalProps) {
  if (!props.isOpen) return null;
  return (
    <MilestoneModalForm
      key={props.initialMilestone?.id || "new-milestone"}
      {...props}
    />
  );
}

function MilestoneModalForm({
  onClose,
  onSave,
  initialMilestone,
  eventDate,
}: MilestoneModalProps) {
  const isEditing = Boolean(initialMilestone);

  const [title, setTitle] = useState(initialMilestone?.title || "");
  const [description, setDescription] = useState(initialMilestone?.description || "");
  const [targetDate, setTargetDate] = useState(initialMilestone?.targetDate || eventDate);
  const [time, setTime] = useState(initialMilestone?.time || "");
  const [category, setCategory] = useState(initialMilestone?.category || "General");
  const [priority, setPriority] = useState<MilestonePriority>(initialMilestone?.priority || "medium");
  const [status, setStatus] = useState<MilestoneStatus>(
    initialMilestone?.status || (initialMilestone?.completed ? "completed" : "pending")
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle Escape key
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

    const formData: MilestoneFormData = {
      title: title.trim(),
      description: description.trim(),
      targetDate: targetDate.trim(),
      time: time.trim() || undefined,
      priority,
      category: category.trim(),
      status,
    };

    const parseResult = milestoneFormSchema.safeParse(formData);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    // Enforce targetDate cannot be after eventDate
    if (isValidCalendarDate(targetDate) && isValidCalendarDate(eventDate) && targetDate > eventDate) {
      setErrors({
        targetDate: `Milestone date (${targetDate}) cannot be after celebration date (${eventDate}).`,
      });
      return;
    }

    const actualDaysBefore =
      isValidCalendarDate(targetDate) && isValidCalendarDate(eventDate)
        ? Math.max(0, daysBetween(targetDate, eventDate))
        : 0;

    const savedMilestone: TimelineMilestone = {
      id: initialMilestone?.id || `ms-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      title: formData.title,
      description: formData.description || "",
      targetDate: formData.targetDate,
      daysBeforeEvent: actualDaysBefore,
      category: formData.category,
      time: formData.time,
      priority: formData.priority,
      status: formData.status,
      completed: formData.status === "completed",
    };

    onSave(savedMilestone);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg bg-[color:var(--bg-card)] rounded-[var(--radius-lg)] border border-[color:var(--border)] shadow-xl p-6 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[color:var(--border)]">
          <h2
            id="milestone-modal-title"
            className="text-lg font-bold text-[color:var(--text-primary)]"
          >
            {isEditing ? "Edit Milestone" : "Add Preparation Milestone"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <Input
            label="Milestone Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Finalize floral concepts"
            error={errors.title}
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="milestone-description"
              className="text-sm font-medium text-[color:var(--text-primary)]"
            >
              Description (Optional)
            </label>
            <textarea
              id="milestone-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key deliverables, notes, or vendor reminders..."
              className="w-full px-3 py-2 text-sm bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] hover:border-[color:var(--border-strong)] rounded-[var(--radius-sm)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] transition-colors"
            />
            {errors.description && (
              <p className="text-xs text-[color:var(--error)]" role="alert">
                {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="date"
              label="Target Due Date"
              required
              max={eventDate}
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              error={errors.targetDate}
              helperText={eventDate ? `Event date: ${eventDate}` : undefined}
            />

            <Input
              type="time"
              label="Time (Optional)"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              error={errors.time}
              helperText="HH:mm format"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={CATEGORY_OPTIONS}
              error={errors.category}
            />

            <Select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as MilestonePriority)}
              options={PRIORITY_OPTIONS}
              error={errors.priority}
            />

            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
              options={STATUS_OPTIONS}
              error={errors.status}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[color:var(--border)]">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {isEditing ? "Save Changes" : "Create Milestone"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
