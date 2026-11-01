"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Sparkles,
  Heart,
  Gift,
  Users,
  CalendarPlus,
  ArrowRight,
  CheckCircle2,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  Lightbulb,
  Calendar,
  Coins,
  Trash2,
  Edit2,
  Check,
  X,
  ExternalLink,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatBudgetAmount } from "@/lib/utils";
import { planStorage } from "@/lib/storage/planStorage";
import { EVENT_TYPES, type EventPlan, type EventType } from "./types";

const iconMap = {
  wedding: Heart,
  birthday: Gift,
  community: Users,
};

const EMPTY_PLANS: EventPlan[] = [];
const getPlansServerSnapshot = () => EMPTY_PLANS;

export function DashboardView() {
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const savedPlans = useSyncExternalStore(
    (cb) => planStorage.subscribe(cb),
    () => planStorage.getAll(),
    getPlansServerSnapshot
  );
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleStartRename = (plan: EventPlan) => {
    setEditingPlanId(plan.id);
    setEditName(plan.eventDetails.name);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      planStorage.rename(id, editName.trim());
    }
    setEditingPlanId(null);
  };

  const handleDeletePlan = (id: string) => {
    planStorage.delete(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-12 pb-12">
      {/* ─── Hero / Welcoming Header ───────────────────────────── */}
      <section className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[color:var(--bg-card)] border border-[color:var(--border)] p-6 sm:p-10 shadow-xs">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[color:var(--accent-primary-light)] text-[color:var(--accent-primary)] text-xs font-semibold mb-4 border border-[color:var(--accent-primary)]/20">
            <Sparkles size={14} aria-hidden="true" />
            <span>AI-Powered Event Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[color:var(--text-primary)] mb-4">
            Plan your next memorable{" "}
            <span className="text-[color:var(--accent-primary)] underline decoration-[color:var(--gold)]/40 decoration-wavy decoration-2">
              celebration
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[color:var(--text-secondary)] leading-relaxed mb-8 max-w-2xl">
            Bring weddings, birthdays, and community gatherings to life with intelligent coordination. CelebrAI crafts personalized themes, realistic budgets, minute-by-minute timelines, and vendor checklists.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link href={selectedType ? `/events/new?type=${selectedType}` : "/events/new"}>
              <Button size="lg" icon={CalendarPlus} variant="primary">
                Plan a celebration
              </Button>
            </Link>

            <a href="#how-it-works">
              <Button size="lg" variant="secondary">
                How It Works
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ─── Event-Type Selection ──────────────────────────────── */}
      <section aria-labelledby="choose-event-heading">
        <SectionHeading
          id="choose-event-heading"
          title="Choose a Celebration Type"
          subtitle="Select an event archetype to initialize tailored schedules, budgetary models, and vendor recommendations."
          badge={
            selectedType ? (
              <Badge variant="primary" size="sm">
                Selected: {EVENT_TYPES.find((t) => t.id === selectedType)?.title}
              </Badge>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="radiogroup" aria-label="Celebration event types">
          {EVENT_TYPES.map((type) => {
            const isSelected = selectedType === type.id;
            const Icon = iconMap[type.id];

            return (
              <div
                key={type.id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => setSelectedType(type.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedType(type.id);
                  }
                }}
                className={[
                  "group relative text-left rounded-[var(--radius-lg)] p-6 transition-all duration-200 cursor-pointer border bg-[color:var(--bg-card)]",
                  "focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] focus-visible:outline-offset-2",
                  isSelected
                    ? "border-[color:var(--accent-primary)] ring-2 ring-[color:var(--accent-primary)]/20 shadow-md bg-[color:var(--accent-primary-light)]/20"
                    : "border-[color:var(--border)] hover:border-[color:var(--border-strong)] hover:shadow-sm",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* Header: Icon & Badge */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div
                    className={[
                      "w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-[color:var(--accent-primary)] text-white shadow-xs"
                        : "bg-[color:var(--bg-subtle)] text-[color:var(--text-secondary)] group-hover:text-[color:var(--accent-primary)] group-hover:bg-[color:var(--accent-primary-light)]",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <Icon size={24} aria-hidden="true" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={type.badgeVariant} size="sm">
                      {type.badge}
                    </Badge>
                    {isSelected && (
                      <CheckCircle2
                        size={20}
                        className="text-[color:var(--accent-primary)]"
                        aria-label="Selected"
                      />
                    )}
                  </div>
                </div>

                {/* Title & Tagline */}
                <h3 className="text-xl font-bold text-[color:var(--text-primary)] mb-2 group-hover:text-[color:var(--accent-primary)] transition-colors">
                  {type.title}
                </h3>
                <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed mb-6">
                  {type.tagline}
                </p>

                {/* Feature highlights */}
                <ul className="space-y-2 mb-6 border-t border-[color:var(--border)] pt-4 text-xs text-[color:var(--text-secondary)]">
                  {type.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--gold)] shrink-0" aria-hidden="true" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* Action button inside card */}
                <div className="pt-2">
                  <Link
                    href={`/events/new?type=${type.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full inline-block"
                  >
                    <Button
                      variant={isSelected ? "primary" : "outline"}
                      size="sm"
                      fullWidth
                      icon={ArrowRight}
                      iconPosition="right"
                    >
                      {isSelected ? `Start ${type.title}` : `Select ${type.title}`}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Recent Plans Section (Saved Plans Grid or Empty State) */}
      <section aria-labelledby="recent-plans-heading">
        <SectionHeading
          id="recent-plans-heading"
          title="Recent Celebrations"
          subtitle="View and continue managing previously generated event plans."
          action={
            <Link href="/events/new">
              <Button size="sm" variant="outline" icon={CalendarPlus}>
                New Plan
              </Button>
            </Link>
          }
        />

        {savedPlans.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="No celebrations planned yet"
            description="You haven't generated any event plans yet. Select a celebration archetype above or click below to launch your first event planner."
            action={
              <Link href={selectedType ? `/events/new?type=${selectedType}` : "/events/new"}>
                <Button variant="primary" icon={Sparkles}>
                  {selectedType ? `Create ${EVENT_TYPES.find((t) => t.id === selectedType)?.title} Plan` : "Start First Celebration"}
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedPlans.map((plan) => {
                const isEditing = editingPlanId === plan.id;
                const isDeleting = confirmDeleteId === plan.id;
                const details = plan.eventDetails;
                const currency = details.currency;

                return (
                  <Card key={plan.id} className="p-5 flex flex-col justify-between hover:border-[color:var(--border-strong)] transition-colors">
                    <div>
                      {/* Card Header: Archetype Badge & Actions */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge size="sm" variant={details.eventType === "wedding" ? "rose" : details.eventType === "birthday" ? "gold" : "primary"}>
                          {details.eventType.charAt(0).toUpperCase() + details.eventType.slice(1)}
                        </Badge>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartRename(plan)}
                            aria-label={`Rename ${details.name}`}
                            className="p-1 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] rounded focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)]"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(plan.id)}
                            aria-label={`Delete ${details.name}`}
                            className="p-1 text-[color:var(--text-secondary)] hover:text-[color:var(--error)] rounded focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Plan Title (or Inline Rename) */}
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 mb-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="text-sm font-semibold p-1 px-2 border rounded bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border-[color:var(--border-focus)] w-full"
                            autoFocus
                            aria-label="Edit celebration name"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(plan.id);
                              if (e.key === "Escape") setEditingPlanId(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(plan.id)}
                            aria-label="Save name"
                            className="p-1.5 bg-[color:var(--accent-primary)] text-white rounded hover:opacity-90"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPlanId(null)}
                            aria-label="Cancel rename"
                            className="p-1.5 border rounded hover:bg-[color:var(--bg-subtle)] text-[color:var(--text-secondary)]"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <h3 className="font-bold text-base text-[color:var(--text-primary)] mb-2 line-clamp-1">
                          {details.name}
                        </h3>
                      )}

                      {/* Plan Parameters Quick Summary */}
                      <div className="space-y-1.5 text-xs text-[color:var(--text-secondary)] mb-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-[color:var(--accent-primary)] shrink-0" />
                          <span>{details.eventDate || "Date TBD"}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-[color:var(--accent-primary)] shrink-0" />
                          <span>{details.guestCount} Attendees</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Coins size={13} className="text-[color:var(--accent-primary)] shrink-0" />
                          <span>
                            {formatBudgetAmount(details.totalBudget, currency)} ({currency})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Deletion confirmation or Open Plan link */}
                    <div className="border-t border-[color:var(--border)] pt-3 mt-2">
                      {isDeleting ? (
                        <div className="bg-[color:var(--error-light)] p-2.5 rounded-[var(--radius-sm)] border border-[color:var(--error)]/30 text-xs space-y-2">
                          <span className="text-[color:var(--error)] font-medium block">
                            Permanently delete this plan?
                          </span>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 border rounded bg-white text-xs font-medium text-[color:var(--text-primary)]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePlan(plan.id)}
                              className="px-2 py-1 rounded bg-[color:var(--error)] text-white text-xs font-medium hover:opacity-90"
                            >
                              Confirm Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[color:var(--text-muted)]">
                            v{plan.metadata?.version || 1}
                          </span>
                          <Link href={`/plans/${plan.id}`}>
                            <Button size="sm" variant="primary" icon={ExternalLink} iconPosition="right">
                              Open Plan
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-xs text-[color:var(--text-muted)] p-2">
              <Info size={14} className="shrink-0" />
              <span>Saved celebration plans are stored locally in this browser.</span>
            </div>
          </div>
        )}
      </section>

      {/* ─── First-Use Experience / How It Works ────────────────── */}
      <section id="how-it-works" aria-labelledby="how-it-works-heading">
        <SectionHeading
          id="how-it-works-heading"
          title="How CelebrAI Works"
          subtitle="Three simple steps from initial inspiration to flawless event execution."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="w-8 h-8 rounded-full bg-[color:var(--accent-primary)] text-white text-sm font-bold flex items-center justify-center mb-4">
              1
            </div>
            <h3 className="text-base font-semibold text-[color:var(--text-primary)] mb-2">
              Select Archetype & Preferences
            </h3>
            <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
              Define event scale, date, guest count, and aesthetic preferences for weddings, birthdays, or community gatherings.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-8 h-8 rounded-full bg-[color:var(--accent-secondary)] text-white text-sm font-bold flex items-center justify-center mb-4">
              2
            </div>
            <h3 className="text-base font-semibold text-[color:var(--text-primary)] mb-2">
              Intelligent Synthesis
            </h3>
            <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
              Gemini translates your goals into structured schedules, categorized budget ranges, and tailored vendor requirements.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-8 h-8 rounded-full bg-[color:var(--gold)] text-white text-sm font-bold flex items-center justify-center mb-4">
              3
            </div>
            <h3 className="text-base font-semibold text-[color:var(--text-primary)] mb-2">
              Coordinate & Execute
            </h3>
            <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
              Refine milestones, track budget allocations in real-time, and check off vendor deliverables on event day.
            </p>
          </Card>
        </div>
      </section>

      {/* ─── Planner Capabilities Overview ──────────────────────── */}
      <section aria-labelledby="capabilities-heading">
        <SectionHeading
          id="capabilities-heading"
          title="Core Capabilities"
          subtitle="Everything required to plan and execute sophisticated events without the chaos."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-5">
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[color:var(--accent-primary-light)] text-[color:var(--accent-primary)] flex items-center justify-center mb-3">
              <Lightbulb size={20} aria-hidden="true" />
            </div>
            <h4 className="font-semibold text-sm text-[color:var(--text-primary)] mb-1">
              Personalized Themes
            </h4>
            <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">
              AI-generated decor styles, color palettes, and creative concepts tailored to your personal tastes.
            </p>
          </Card>

          <Card className="p-5">
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[color:var(--gold-light)] text-[color:var(--gold)] flex items-center justify-center mb-3">
              <CircleDollarSign size={20} aria-hidden="true" />
            </div>
            <h4 className="font-semibold text-sm text-[color:var(--text-primary)] mb-1">
              Smart Budgeting
            </h4>
            <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">
              Algorithmic expense allocations across venue, catering, decor, and emergency reserve funds.
            </p>
          </Card>

          <Card className="p-5">
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[color:var(--accent-secondary-light)] text-[color:var(--accent-secondary)] flex items-center justify-center mb-3">
              <CalendarClock size={20} aria-hidden="true" />
            </div>
            <h4 className="font-semibold text-sm text-[color:var(--text-primary)] mb-1">
              Coordinated Timelines
            </h4>
            <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">
              Chronological milestone management from months in advance down to the day-of run-of-show.
            </p>
          </Card>

          <Card className="p-5">
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[color:var(--success-light)] text-[color:var(--success)] flex items-center justify-center mb-3">
              <ClipboardList size={20} aria-hidden="true" />
            </div>
            <h4 className="font-semibold text-sm text-[color:var(--text-primary)] mb-1">
              Vendor Checklists
            </h4>
            <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">
              Specific deliverables, contract checklist items, and contact logs for every supplier.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
