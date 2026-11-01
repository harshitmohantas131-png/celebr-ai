"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { scheduleItemFormSchema, type ScheduleItemFormData } from "@/lib/schemas/timeline";
import type { ScheduleItem } from "@/types/event";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ScheduleItem) => void;
  initialItem?: ScheduleItem | null;
}

export function ScheduleModal(props: ScheduleModalProps) {
  if (!props.isOpen) return null;
  return (
    <ScheduleModalForm
      key={props.initialItem?.id || "new-schedule-item"}
      {...props}
    />
  );
}

function ScheduleModalForm({
  onClose,
  onSave,
  initialItem,
}: ScheduleModalProps) {
  const isEditing = Boolean(initialItem);

  const [title, setTitle] = useState(initialItem?.title || "");
  const [startTime, setStartTime] = useState(initialItem?.startTime || "12:00");
  const [endTime, setEndTime] = useState(initialItem?.endTime || "13:00");
  const [description, setDescription] = useState(initialItem?.description || "");
  const [location, setLocation] = useState(initialItem?.location || "");
  const [responsibleRole, setResponsibleRole] = useState(initialItem?.responsibleRole || "");
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

    const formData: ScheduleItemFormData = {
      title: title.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      description: description.trim(),
      location: location.trim() || undefined,
      responsibleRole: responsibleRole.trim() || undefined,
    };

    const parseResult = scheduleItemFormSchema.safeParse(formData);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    const savedItem: ScheduleItem = {
      id:
        initialItem?.id ||
        `sch-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      title: formData.title,
      startTime: formData.startTime,
      endTime: formData.endTime,
      description: formData.description || "",
      location: formData.location,
      responsibleRole: formData.responsibleRole,
    };

    onSave(savedItem);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg bg-[color:var(--bg-card)] rounded-[var(--radius-lg)] border border-[color:var(--border)] shadow-xl p-6 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[color:var(--border)]">
          <h2
            id="schedule-modal-title"
            className="text-lg font-bold text-[color:var(--text-primary)]"
          >
            {isEditing ? "Edit Day-of Activity" : "Add Day-of Run Sheet Activity"}
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
            label="Activity Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Guest Arrival & Welcome Cocktails"
            error={errors.title}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="time"
              label="Start Time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              error={errors.startTime}
              helperText="24-hour HH:mm"
            />

            <Input
              type="time"
              label="End Time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              error={errors.endTime}
              helperText="Must be after start time"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="schedule-description"
              className="text-sm font-medium text-[color:var(--text-primary)]"
            >
              Activity Details (Optional)
            </label>
            <textarea
              id="schedule-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cue notes, key activities, music, or instructions..."
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
              label="Location / Zone"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Pavilion Lawn"
              error={errors.location}
            />

            <Input
              label="Responsible Lead / Role"
              value={responsibleRole}
              onChange={(e) => setResponsibleRole(e.target.value)}
              placeholder="e.g., Banquet Captain / DJ"
              error={errors.responsibleRole}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[color:var(--border)]">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {isEditing ? "Save Changes" : "Add to Run Sheet"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
