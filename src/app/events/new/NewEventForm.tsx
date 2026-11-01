"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Info,
  CheckCircle2,
  Heart,
  Gift,
  Users2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LoadingState } from "@/components/ui/LoadingState";
import { EVENT_TYPES, type Currency, type EventDetails, type EventType } from "@/features/planner/types";
import { eventFormSchema } from "@/lib/schemas/event";
import { planStorage } from "@/lib/storage/planStorage";

export function NewEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = (searchParams.get("type") as EventType) || "wedding";

  const [eventType, setEventType] = useState<EventType>(
    ["wedding", "birthday", "community"].includes(initialType) ? initialType : "wedding"
  );
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [location, setLocation] = useState("");
  const [themeNotes, setThemeNotes] = useState("");
  const [dietaryRequirements, setDietaryRequirements] = useState("");
  const [planningPriorities, setPlanningPriorities] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [submittedPreview, setSubmittedPreview] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = (): boolean => {
    const parseResult = eventFormSchema.safeParse({
      eventName,
      eventType,
      eventDate: eventDate || undefined,
      guestCount: guestCount || undefined,
      budget: budget || undefined,
      currency,
      location: location || undefined,
      themeNotes: themeNotes || undefined,
      dietaryRequirements: dietaryRequirements || undefined,
      planningPriorities: planningPriorities || undefined,
      additionalInstructions: additionalInstructions || undefined,
    });

    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const formattedErrors: Record<string, string> = {};
      for (const [key, msgs] of Object.entries(fieldErrors)) {
        if (msgs && msgs.length > 0) {
          formattedErrors[key] = msgs[0];
        }
      }
      setErrors(formattedErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setSubmittedPreview(true);
      setApiError(null);
    }
  };

  const handleGeneratePlan = async () => {
    // Validate required fields for full AI generation
    const validationErrors: Record<string, string> = {};
    if (!eventName.trim()) {
      validationErrors.eventName = "Event name or title is required.";
    }
    if (!eventDate) {
      validationErrors.eventDate = "Target event date is required to generate a timeline.";
    }
    if (!guestCount || isNaN(Number(guestCount)) || Number(guestCount) <= 0) {
      validationErrors.guestCount = "Guest count must be a positive number.";
    }
    if (!budget || isNaN(Number(budget)) || Number(budget) <= 0) {
      validationErrors.budget = "Budget must be a positive number.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmittedPreview(false);
      return;
    }

    setIsGenerating(true);
    setApiError(null);

    try {
      const payload: EventDetails = {
        name: eventName.trim(),
        eventType,
        eventDate,
        location: location.trim(),
        guestCount: Number(guestCount),
        totalBudget: Number(budget),
        currency,
        theme: themeNotes.trim(),
        culturalPreferences: additionalInstructions ? [additionalInstructions.trim()] : [],
        dietaryRequirements: dietaryRequirements
          ? dietaryRequirements.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        planningPriorities: planningPriorities
          ? planningPriorities.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        additionalInstructions: additionalInstructions.trim(),
      };

      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result?.error?.message || "Failed to generate celebration plan. Please try again."
        );
      }

      // Save plan into browser local storage
      planStorage.save(result.data);

      // Navigate to plan view
      router.push(`/plans/${result.data.id}`);
    } catch (err: unknown) {
      setApiError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during AI plan generation."
      );
      setIsGenerating(false);
    }
  };

  const selectedArchetype = EVENT_TYPES.find((t) => t.id === eventType);

  const formattedBudgetDisplay = budget
    ? currency === "USD"
      ? `$${Number(budget).toLocaleString()}`
      : `₹${Number(budget).toLocaleString("en-IN")}`
    : "Flexible";

  if (isGenerating) {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <LoadingState
          message="Synthesizing your celebration plan with Gemini AI..."
          className="p-12 rounded-[var(--radius-xl)] bg-[color:var(--bg-card)] border border-[color:var(--border)] shadow-xs"
        />
        <p className="text-center text-xs text-[color:var(--text-secondary)] mt-4">
          Generating customized schedules, algorithmic budget allocations, and vendor deliverables.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Back Link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] rounded-[var(--radius-sm)]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Page Title */}
      <SectionHeading
        as="h1"
        title="Plan a Celebration"
        subtitle="Configure the scope and parameters for your upcoming event. These parameters initialize your personalized schedule, budget model, and vendor checklist."
        badge={
          <Badge variant="primary" size="md">
            AI Event Architect
          </Badge>
        }
      />

      {/* API Generation Error Banner */}
      {apiError && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[color:var(--error-light)] border border-[color:var(--error)] text-[color:var(--text-primary)]"
        >
          <AlertCircle size={20} className="shrink-0 text-[color:var(--error)] mt-0.5" />
          <div className="text-sm flex-1">
            <strong className="font-semibold block mb-1 text-[color:var(--error)]">
              Generation Error
            </strong>
            <p className="mb-3 leading-relaxed">{apiError}</p>
            <Button
              size="sm"
              variant="outline"
              icon={RefreshCw}
              onClick={handleGeneratePlan}
            >
              Retry Generation
            </Button>
          </div>
        </div>
      )}

      {/* Notice Callout */}
      {!apiError && (
        <div className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[color:var(--gold-light)] border border-[color:var(--gold)]/30 text-[color:var(--text-primary)]">
          <Info size={18} className="shrink-0 text-[color:var(--gold)] mt-0.5" aria-hidden="true" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <strong className="font-semibold">AI Synthesis:</strong> Configure celebration details below. Submitting will trigger live Gemini AI synthesis to generate your schedule, budget breakdown, and vendor checklist.
          </div>
        </div>
      )}

      {/* Submitted Preview State */}
      {submittedPreview && (
        <Card className="border-[color:var(--success)]/40 bg-[color:var(--success-light)]/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-[color:var(--success)]" aria-hidden="true" />
                <h2 className="text-base font-semibold text-[color:var(--text-primary)]">
                  Event Parameters Saved Locally
                </h2>
              </div>
              <Badge variant="success" size="sm">
                Ready for AI Synthesis
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div>
                <span className="font-medium text-[color:var(--text-secondary)]">Archetype:</span>{" "}
                <strong className="text-[color:var(--text-primary)]">{selectedArchetype?.title}</strong>
              </div>
              <div>
                <span className="font-medium text-[color:var(--text-secondary)]">Event Title:</span>{" "}
                <strong className="text-[color:var(--text-primary)]">{eventName}</strong>
              </div>
              <div>
                <span className="font-medium text-[color:var(--text-secondary)]">Target Date:</span>{" "}
                <strong className="text-[color:var(--text-primary)]">{eventDate || "Not specified"}</strong>
              </div>
              <div>
                <span className="font-medium text-[color:var(--text-secondary)]">Location:</span>{" "}
                <strong className="text-[color:var(--text-primary)]">{location || "Not specified"}</strong>
              </div>
              <div>
                <span className="font-medium text-[color:var(--text-secondary)]">Expected Guests:</span>{" "}
                <strong className="text-[color:var(--text-primary)]">{guestCount || "Flexible"}</strong>
              </div>
              <div>
                <span className="font-medium text-[color:var(--text-secondary)]">Estimated Budget:</span>{" "}
                <strong className="text-[color:var(--text-primary)]">
                  {formattedBudgetDisplay} ({currency})
                </strong>
              </div>
              {dietaryRequirements && (
                <div className="sm:col-span-2">
                  <span className="font-medium text-[color:var(--text-secondary)]">Dietary Requirements:</span>{" "}
                  <span className="text-[color:var(--text-primary)]">{dietaryRequirements}</span>
                </div>
              )}
              {planningPriorities && (
                <div className="sm:col-span-2">
                  <span className="font-medium text-[color:var(--text-secondary)]">Priorities:</span>{" "}
                  <span className="text-[color:var(--text-primary)]">{planningPriorities}</span>
                </div>
              )}
              {themeNotes && (
                <div className="sm:col-span-2">
                  <span className="font-medium text-[color:var(--text-secondary)]">Theme / Style Notes:</span>{" "}
                  <span className="text-[color:var(--text-primary)]">{themeNotes}</span>
                </div>
              )}
              {additionalInstructions && (
                <div className="sm:col-span-2">
                  <span className="font-medium text-[color:var(--text-secondary)]">Additional Notes:</span>{" "}
                  <span className="text-[color:var(--text-primary)]">{additionalInstructions}</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button size="sm" variant="outline" onClick={() => setSubmittedPreview(false)}>
              Edit Parameters
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link href="/">
                <Button size="sm" variant="secondary">
                  Return to Dashboard
                </Button>
              </Link>
              <Button
                size="sm"
                variant="primary"
                icon={Sparkles}
                onClick={handleGeneratePlan}
              >
                Generate AI Plan
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Form */}
      {!submittedPreview && (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-[color:var(--text-primary)]">
                Celebration Details
              </h2>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Event Archetype Selection */}
              <div>
                <label className="block text-sm font-medium text-[color:var(--text-primary)] mb-2">
                  Celebration Archetype <span className="text-[color:var(--error)]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {EVENT_TYPES.map((type) => {
                    const isSelected = eventType === type.id;
                    const Icon = type.id === "wedding" ? Heart : type.id === "birthday" ? Gift : Users2;

                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setEventType(type.id)}
                        className={[
                          "flex flex-col items-start p-3.5 rounded-[var(--radius-md)] border text-left transition-all",
                          "focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)]",
                          isSelected
                            ? "border-[color:var(--accent-primary)] bg-[color:var(--accent-primary-light)]/40 ring-1 ring-[color:var(--accent-primary)]"
                            : "border-[color:var(--border)] hover:border-[color:var(--border-strong)] bg-[color:var(--bg-card)]",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <Icon
                            size={18}
                            className={isSelected ? "text-[color:var(--accent-primary)]" : "text-[color:var(--text-secondary)]"}
                            aria-hidden="true"
                          />
                          {isSelected && (
                            <CheckCircle2 size={16} className="text-[color:var(--accent-primary)]" aria-label="Selected" />
                          )}
                        </div>
                        <span className="font-semibold text-sm text-[color:var(--text-primary)]">
                          {type.title}
                        </span>
                        <span className="text-xs text-[color:var(--text-secondary)] line-clamp-1 mt-0.5">
                          {type.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Event Name */}
              <Input
                label="Celebration Name"
                placeholder="e.g. Maya & Leo's Autumn Wedding, Liam's 30th Birthday"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                error={errors.eventName}
                required
                helperText="A descriptive title for your celebration plan"
              />

              {/* Date and Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Target Event Date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  error={errors.eventDate}
                  helperText="Approximate or planned date (must be present or future)"
                />

                <Input
                  label="Location / Venue City"
                  placeholder="e.g. Napa Valley, CA or Mumbai, India"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  error={errors.location}
                  helperText="City, destination, or venue"
                />
              </div>

              {/* Guest Count and Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Expected Guest Count"
                    type="number"
                    min="1"
                    placeholder="e.g. 75"
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                    error={errors.guestCount}
                    helperText="Number of anticipated attendees"
                  />
                </div>

                <Select
                  label="Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  options={[
                    { value: "USD", label: "USD ($)" },
                    { value: "INR", label: "INR (₹)" },
                  ]}
                  helperText="Planning currency"
                />
              </div>

              {/* Estimated Budget */}
              <Input
                label={`Estimated Total Budget (${currency})`}
                type="number"
                min="0"
                step="50"
                placeholder={currency === "USD" ? "e.g. 15000" : "e.g. 500000"}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                error={errors.budget}
                helperText="Target expenditure for venue, catering, decor, and vendors"
              />

              {/* Dietary Requirements and Planning Priorities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Dietary Requirements (Optional)"
                  placeholder="e.g. Vegetarian, Vegan, Gluten-free, Halal"
                  value={dietaryRequirements}
                  onChange={(e) => setDietaryRequirements(e.target.value)}
                  error={errors.dietaryRequirements}
                  helperText="Special guest dietary considerations"
                />

                <Input
                  label="Planning Priorities (Optional)"
                  placeholder="e.g. Scenic Venue, Photography, Live Music"
                  value={planningPriorities}
                  onChange={(e) => setPlanningPriorities(e.target.value)}
                  error={errors.planningPriorities}
                  helperText="What matters most for this celebration"
                />
              </div>

              {/* Theme & Style Notes */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="themeNotes"
                  className="text-sm font-medium text-[color:var(--text-primary)]"
                >
                  Theme & Aesthetic Notes (Optional)
                </label>
                <textarea
                  id="themeNotes"
                  rows={3}
                  value={themeNotes}
                  onChange={(e) => setThemeNotes(e.target.value)}
                  placeholder="e.g. Rustic botanical aesthetic with warm earthy tones, acoustic live music, outdoor garden dining..."
                  className="w-full p-3 text-sm bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] focus:ring-offset-1 resize-y placeholder:text-[color:var(--text-muted)] hover:border-[color:var(--border-strong)] transition-colors"
                />
                <p className="text-xs text-[color:var(--text-muted)]">
                  Creative cues that will be used during AI synthesis to personalize your checklist and timeline.
                </p>
                {errors.themeNotes && (
                  <p className="text-xs text-[color:var(--error)]" role="alert">
                    {errors.themeNotes}
                  </p>
                )}
              </div>

              {/* Additional Instructions */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="additionalInstructions"
                  className="text-sm font-medium text-[color:var(--text-primary)]"
                >
                  Additional Instructions & Cultural Preferences (Optional)
                </label>
                <textarea
                  id="additionalInstructions"
                  rows={2}
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="e.g. Include traditional tea ceremony, prefer eco-friendly and zero-waste vendors..."
                  className="w-full p-3 text-sm bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] focus:ring-offset-1 resize-y placeholder:text-[color:var(--text-muted)] hover:border-[color:var(--border-strong)] transition-colors"
                />
                <p className="text-xs text-[color:var(--text-muted)]">
                  Any specific constraints, cultural traditions, or coordinator notes.
                </p>
                {errors.additionalInstructions && (
                  <p className="text-xs text-[color:var(--error)]" role="alert">
                    {errors.additionalInstructions}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-[color:var(--text-secondary)]">
                All parameters can be refined or adjusted later.
              </span>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Link href="/" className="w-full sm:w-auto">
                  <Button type="button" variant="outline" fullWidth>
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" variant="secondary" fullWidth>
                  Save & Preview Parameters
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  icon={Sparkles}
                  onClick={handleGeneratePlan}
                  fullWidth
                >
                  Generate AI Plan
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
}
