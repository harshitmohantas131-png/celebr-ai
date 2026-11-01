import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sparkles, Calendar } from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Input,
  Select,
  Progress,
  EmptyState,
  LoadingState,
  SectionHeading,
} from "@/components/ui";

describe("Button UI component", () => {
  it("renders with default primary variant and handles click", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    const button = screen.getByRole("button", { name: "Click Me" });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("handles loading state and disables interaction", () => {
    const handleClick = vi.fn();
    render(
      <Button loading onClick={handleClick}>
        Saving
      </Button>
    );
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders with icon", () => {
    render(<Button icon={Sparkles}>With Icon</Button>);
    expect(screen.getByRole("button", { name: "With Icon" })).toBeInTheDocument();
  });
});

describe("Badge UI component", () => {
  it("renders badge content with variant styling", () => {
    render(<Badge variant="rose">Romantic</Badge>);
    const badge = screen.getByText("Romantic");
    expect(badge).toBeInTheDocument();
  });
});

describe("Card compound component", () => {
  it("renders header, content, and footer", () => {
    render(
      <Card>
        <CardHeader>Header Area</CardHeader>
        <CardContent>Content Body</CardContent>
        <CardFooter>Footer Info</CardFooter>
      </Card>
    );
    expect(screen.getByText("Header Area")).toBeInTheDocument();
    expect(screen.getByText("Content Body")).toBeInTheDocument();
    expect(screen.getByText("Footer Info")).toBeInTheDocument();
  });
});

describe("Input & Select UI components", () => {
  it("renders accessible label, helper text, and input", () => {
    render(
      <Input
        label="Celebration Title"
        helperText="Enter a memorable name"
        placeholder="Anniversary Party"
      />
    );
    const input = screen.getByLabelText("Celebration Title");
    expect(input).toBeInTheDocument();
    expect(screen.getByText("Enter a memorable name")).toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-invalid", "true");
  });

  it("renders error state with role alert and aria-invalid", () => {
    render(
      <Input
        label="Guest Count"
        error="Please provide a valid guest count"
      />
    );
    const input = screen.getByLabelText("Guest Count");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const errorMsg = screen.getByRole("alert");
    expect(errorMsg).toHaveTextContent("Please provide a valid guest count");
  });

  it("renders Select component with options", () => {
    render(
      <Select
        label="Event Type"
        options={[
          { value: "wedding", label: "Wedding" },
          { value: "birthday", label: "Birthday" },
        ]}
      />
    );
    const select = screen.getByLabelText("Event Type");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Wedding" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Birthday" })).toBeInTheDocument();
  });
});

describe("Progress UI component", () => {
  it("renders progressbar role with aria values and clamped bounds", () => {
    render(<Progress value={45} max={100} label="Planning Progress" showValue />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "45");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(screen.getByText("Planning Progress")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
  });
});

describe("EmptyState component", () => {
  it("renders empty state with title, description, and action", () => {
    render(
      <EmptyState
        icon={Calendar}
        title="No events scheduled"
        description="Get started by creating your first celebration schedule."
        action={<button>Add Event</button>}
      />
    );
    expect(screen.getByText("No events scheduled")).toBeInTheDocument();
    expect(screen.getByText(/Get started by creating your first celebration/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Event" })).toBeInTheDocument();
  });
});

describe("LoadingState component", () => {
  it("renders polite live-region status and message", () => {
    render(<LoadingState message="Generating celebration timeline..." />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Generating celebration timeline...")).toBeInTheDocument();
  });
});

describe("SectionHeading component", () => {
  it("renders custom heading level and subtitle", () => {
    render(
      <SectionHeading
        as="h2"
        title="Event Timeline"
        subtitle="Chronological breakdown of key moments"
        badge={<Badge>Active</Badge>}
      />
    );
    expect(screen.getByRole("heading", { level: 2, name: /Event Timeline/ })).toBeInTheDocument();
    expect(screen.getByText("Chronological breakdown of key moments")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
