import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NewEventForm } from "@/app/events/new/NewEventForm";
import { planStorage } from "@/lib/storage/planStorage";
import type { EventPlan } from "@/types/event";

const mockPush = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams("type=wedding"),
}));

describe("NewEventForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders with initial archetype and form fields", () => {
    render(<NewEventForm />);

    expect(screen.getByRole("heading", { level: 1, name: "Plan a Celebration" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Celebration Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Target Event Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Expected Guest Count/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estimated Total Budget/i)).toBeInTheDocument();
  });

  it("validates required event name on submission", () => {
    render(<NewEventForm />);

    const submitButton = screen.getByRole("button", { name: /Save & Preview Parameters/i });
    fireEvent.click(submitButton);

    expect(screen.getByText("Event name or title is required.")).toBeInTheDocument();
  });

  it("submits valid form and displays local parameter preview", () => {
    render(<NewEventForm />);

    // Fill in required name
    const nameInput = screen.getByLabelText(/Celebration Name/i);
    fireEvent.change(nameInput, { target: { value: "Maya & Leo's Fall Wedding" } });

    // Fill in guest count
    const guestInput = screen.getByLabelText(/Expected Guest Count/i);
    fireEvent.change(guestInput, { target: { value: "120" } });

    // Submit
    const submitButton = screen.getByRole("button", { name: /Save & Preview Parameters/i });
    fireEvent.click(submitButton);

    // Expect preview confirmation
    expect(screen.getByText("Event Parameters Saved Locally")).toBeInTheDocument();
    expect(screen.getByText("Maya & Leo's Fall Wedding")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  it("validates negative guest count and shows field-level error", () => {
    render(<NewEventForm />);

    const nameInput = screen.getByLabelText(/Celebration Name/i);
    fireEvent.change(nameInput, { target: { value: "Maya & Leo's Fall Wedding" } });

    const guestInput = screen.getByLabelText(/Expected Guest Count/i);
    fireEvent.change(guestInput, { target: { value: "-10" } });

    const submitButton = screen.getByRole("button", { name: /Save & Preview Parameters/i });
    fireEvent.click(submitButton);

    expect(screen.getByText("Guest count must be a positive number.")).toBeInTheDocument();
  });

  it("supports currency selection and previews with selected currency", () => {
    render(<NewEventForm />);

    const nameInput = screen.getByLabelText(/Celebration Name/i);
    fireEvent.change(nameInput, { target: { value: "Aarav & Priya's Sangeet" } });

    const currencySelect = screen.getByLabelText(/Currency/i);
    fireEvent.change(currencySelect, { target: { value: "INR" } });

    const budgetInput = screen.getByLabelText(/Estimated Total Budget/i);
    fireEvent.change(budgetInput, { target: { value: "500000" } });

    const submitButton = screen.getByRole("button", { name: /Save & Preview Parameters/i });
    fireEvent.click(submitButton);

    expect(screen.getByText("Event Parameters Saved Locally")).toBeInTheDocument();
    expect(screen.getByText("Aarav & Priya's Sangeet")).toBeInTheDocument();
    expect(screen.getByText(/₹5,00,000/)).toBeInTheDocument();
    expect(screen.getByText(/INR/)).toBeInTheDocument();
  });

  it("handles AI generation successfully and routes to /plans/:id", async () => {
    const mockPlan: EventPlan = {
      id: "test-plan-123",
      eventDetails: {
        name: "Botanical Wedding",
        eventType: "wedding",
        eventDate: "2026-11-20",
        location: "Carmel, CA",
        guestCount: 85,
        totalBudget: 25000,
        currency: "USD",
        theme: "",
        culturalPreferences: [],
        dietaryRequirements: [],
        planningPriorities: [],
        additionalInstructions: "",
      },
      overview: {
        summary: "A beautiful botanical celebration.",
        personalizedIdeas: ["Wildflower seed favors", "Herbal cocktails"],
        themeConcept: "Botanical elegance",
        colorPalette: ["#4CAF50"],
      },
      budget: {
        categories: [
          {
            id: "cat-1",
            name: "Venue",
            allocatedAmount: 10000,
            items: [
              {
                id: "item-1",
                categoryId: "cat-1",
                name: "Garden Pavilion Rental",
                estimatedCost: 10000,
                priority: "high",
              },
            ],
          },
        ],
        contingencyRate: 0.1,
        calculation: {
          currency: "USD",
          totalBudget: 25000,
          categorySubtotal: 10000,
          contingencyRate: 0.1,
          contingencyAmount: 1000,
          totalEstimatedCost: 11000,
          remainingBudget: 14000,
          isOverBudget: false,
          overBudgetAmount: 0,
          categoryBreakdown: [
            {
              categoryId: "cat-1",
              categoryName: "Venue",
              subtotal: 10000,
              percentageOfTotal: 90.91,
              itemCount: 1,
            },
          ],
          warnings: [],
        },
      },
      milestones: [
        {
          id: "ms-1",
          title: "Book Venue",
          description: "Secure garden pavilion",
          targetDate: "2026-11-01",
          daysBeforeEvent: 19,
          category: "venue",
          completed: true,
        },
      ],
      schedule: [
        {
          id: "sch-1",
          title: "Guest Arrival",
          startTime: "16:00",
          endTime: "16:30",
          description: "Welcome drinks",
        },
      ],
      checklist: [
        {
          id: "chk-1",
          title: "Send Invitations",
          category: "invitations",
          status: "pending",
          priority: "high",
        },
      ],
      metadata: {
        createdAt: "2026-10-30T10:00:00.000Z",
        version: 1,
        currency: "USD",
        eventType: "wedding",
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockPlan }),
    });

    render(<NewEventForm />);

    // Fill required fields for full plan generation
    fireEvent.change(screen.getByLabelText(/Celebration Name/i), {
      target: { value: "Botanical Wedding" },
    });
    fireEvent.change(screen.getByLabelText(/Target Event Date/i), {
      target: { value: "2026-11-20" },
    });
    fireEvent.change(screen.getByLabelText(/Expected Guest Count/i), {
      target: { value: "85" },
    });
    fireEvent.change(screen.getByLabelText(/Estimated Total Budget/i), {
      target: { value: "25000" },
    });

    const generateBtn = screen.getByRole("button", { name: /Generate AI Plan/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/plans/test-plan-123");
    });

    // Check plan saved into localStorage
    const saved = planStorage.getById("test-plan-123");
    expect(saved).not.toBeNull();
    expect(saved?.eventDetails.name).toBe("Botanical Wedding");
  });

  it("displays error banner when AI generation fails and allows retry", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: { code: "PROVIDER_ERROR", message: "Gemini quota exceeded. Please try again later." },
      }),
    });

    render(<NewEventForm />);

    fireEvent.change(screen.getByLabelText(/Celebration Name/i), {
      target: { value: "Botanical Wedding" },
    });
    fireEvent.change(screen.getByLabelText(/Target Event Date/i), {
      target: { value: "2026-11-20" },
    });
    fireEvent.change(screen.getByLabelText(/Expected Guest Count/i), {
      target: { value: "85" },
    });
    fireEvent.change(screen.getByLabelText(/Estimated Total Budget/i), {
      target: { value: "25000" },
    });

    const generateBtn = screen.getByRole("button", { name: /Generate AI Plan/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Gemini quota exceeded/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retry Generation/i })).toBeInTheDocument();
    });
  });
});
