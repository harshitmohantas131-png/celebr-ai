import { test, expect } from '@playwright/test';

const mockGeneratedPlan = {
  id: "plan-e2e-wedding",
  eventDetails: {
    name: "Maya & Liam's Garden Wedding",
    eventType: "wedding",
    eventDate: "2026-11-20",
    location: "Napa Valley, CA",
    guestCount: 100,
    totalBudget: 20000,
    currency: "USD",
    theme: "Botanical Rustic",
    culturalPreferences: [],
    dietaryRequirements: ["Vegetarian"],
    planningPriorities: ["Scenic Venue"],
    additionalInstructions: "",
  },
  overview: {
    summary: "An enchanting garden celebration under the Napa vines.",
    personalizedIdeas: ["Wildflower seating tags", "Artisanal wine pairings"],
    themeConcept: "Botanical Rustic with olive greens and ivory accents",
    colorPalette: ["#556B2F", "#FFFFF0"],
  },
  budget: {
    categories: [
      {
        id: "cat-venue",
        name: "Venue & Rentals",
        allocatedAmount: 10000,
        items: [
          {
            id: "item-vineyard",
            categoryId: "cat-venue",
            name: "Vineyard Lawn Rental",
            estimatedCost: 8000,
            priority: "high",
            notes: "Includes chairs and arbor",
          },
          {
            id: "item-lighting",
            categoryId: "cat-venue",
            name: "Bistro String Lights",
            estimatedCost: 1500,
            priority: "medium",
          },
        ],
      },
      {
        id: "cat-catering",
        name: "Catering & Wine",
        allocatedAmount: 7000,
        items: [
          {
            id: "item-buffet",
            categoryId: "cat-catering",
            name: "Farm-to-Table Dinner",
            estimatedCost: 6000,
            priority: "high",
          },
        ],
      },
    ],
    contingencyRate: 0.1,
    calculation: {
      currency: "USD",
      totalBudget: 20000,
      categorySubtotal: 15500,
      contingencyRate: 0.1,
      contingencyAmount: 1550,
      totalEstimatedCost: 17050,
      remainingBudget: 2950,
      isOverBudget: false,
      overBudgetAmount: 0,
      categoryBreakdown: [
        {
          categoryId: "cat-venue",
          categoryName: "Venue & Rentals",
          subtotal: 9500,
          percentageOfTotal: 55.72,
          itemCount: 2,
        },
        {
          categoryId: "cat-catering",
          categoryName: "Catering & Wine",
          subtotal: 6000,
          percentageOfTotal: 35.19,
          itemCount: 1,
        },
      ],
      warnings: [],
    },
  },
  milestones: [
    {
      id: "ms-1",
      title: "Sign Vineyard Contract",
      targetDate: "2026-11-05",
      daysBeforeEvent: 15,
      category: "venue",
      description: "Secure garden lawn and pay deposit",
      completed: true,
    },
    {
      id: "ms-2",
      title: "Confirm Wine Tasting",
      targetDate: "2026-11-12",
      daysBeforeEvent: 8,
      category: "catering",
      description: "Sample varietals for dinner courses",
      completed: false,
    },
  ],
  schedule: [
    {
      id: "sch-1",
      startTime: "16:00",
      endTime: "16:45",
      title: "Guest Arrival & Welcome Spritz",
      location: "Olive Grove",
      description: "Light acoustic guitar and refreshments",
      responsibleRole: "Hospitality Lead",
    },
    {
      id: "sch-2",
      startTime: "17:00",
      endTime: "17:30",
      title: "Ceremony & Ring Exchange",
      location: "Garden Pavilion",
      description: "Sunset vow exchange",
      responsibleRole: "Officiant",
    },
  ],
  checklist: [
    {
      id: "chk-1",
      title: "Review vendor insurance paperwork",
      category: "legal",
      status: "pending",
      priority: "high",
      dueDate: "2026-11-10",
      notes: "Confirm liability certificates",
    },
    {
      id: "chk-2",
      title: "Select floral arch design",
      category: "decor",
      status: "completed",
      priority: "medium",
      dueDate: "2026-11-08",
    },
  ],
  metadata: {
    createdAt: "2026-10-30T10:00:00.000Z",
    version: 1,
    currency: "USD",
    eventType: "wedding",
  },
};

const mockRefinedPlan = {
  ...mockGeneratedPlan,
  metadata: {
    ...mockGeneratedPlan.metadata,
    version: 2,
  },
  overview: {
    ...mockGeneratedPlan.overview,
    summary: "Refined vineyard celebration featuring an acoustic sunset afterparty.",
  },
};

test.describe('CelebrAI Plan Synthesis & Refinement Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before test run
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('synthesizes plan from /events/new, navigates to dashboard, toggles checklist, refines, and manages saved plans', async ({ page }) => {
    // 1. Mock POST /api/plan
    await page.route('**/api/plan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockGeneratedPlan }),
      });
    });

    // 2. Mock POST /api/plan/refine
    await page.route('**/api/plan/refine', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockRefinedPlan }),
      });
    });

    // 3. Fill /events/new form
    await page.goto('/events/new?type=wedding');
    await page.getByLabel(/Celebration Name/i).fill("Maya & Liam's Garden Wedding");
    await page.getByLabel(/Target Event Date/i).fill('2026-11-20');
    await page.getByLabel(/Expected Guest Count/i).fill('100');
    await page.getByLabel(/Estimated Total Budget/i).fill('20000');

    // 4. Click "Generate AI Plan"
    await page.getByRole('button', { name: /Generate AI Plan/i }).click();

    // 5. Verify navigation to /plans/plan-e2e-wedding
    await expect(page).toHaveURL(/\/plans\/plan-e2e-wedding/);

    // 6. Verify Plan Overview and metrics
    await expect(page.getByRole('heading', { level: 1, name: "Maya & Liam's Garden Wedding" })).toBeVisible();
    await expect(page.getByText('Napa Valley, CA')).toBeVisible();
    await expect(page.getByText('100 Guests')).toBeVisible();
    await expect(page.getByText('An enchanting garden celebration under the Napa vines.')).toBeVisible();

    // 7. Verify Budget Breakdown
    await expect(page.getByText('$20,000.00', { exact: true })).toBeVisible();
    await expect(page.getByText('$2,950.00')).toBeVisible();
    await expect(page.getByText('Venue & Rentals')).toBeVisible();
    await expect(page.getByText('Catering & Wine')).toBeVisible();

    // 8. Verify Timeline Milestones
    await expect(page.getByText('Sign Vineyard Contract')).toBeVisible();
    await expect(page.getByText('Confirm Wine Tasting')).toBeVisible();

    // 9. Verify Run-of-Show Schedule
    await expect(page.getByText('16:00 – 16:45')).toBeVisible();
    await expect(page.getByText('Guest Arrival & Welcome Spritz')).toBeVisible();

    // 10. Verify Interactive Checklist and toggle task status
    await expect(page.getByText('1 of 2 Completed (50%)')).toBeVisible();
    const taskCheckbox = page.getByRole('button', {
      name: /Toggle task "Review vendor insurance paperwork" status/i,
    });
    await taskCheckbox.click();
    await expect(page.getByText('2 of 2 Completed (100%)')).toBeVisible();

    // 11. Refine Plan with AI
    await page.getByRole('button', { name: /Refine with AI/i }).click();
    await expect(page.getByRole('heading', { level: 2, name: /Refine Celebration Plan with Gemini/i })).toBeVisible();

    await page.getByLabel(/Refinement Instructions/i).fill('Add an acoustic sunset afterparty in the vineyard.');
    await page.getByRole('button', { name: /Submit Refinement/i }).click();

    // Expect success message and updated summary
    await expect(page.getByText('Celebration plan successfully updated with your refinements!')).toBeVisible();
    await expect(page.getByText('Refined vineyard celebration featuring an acoustic sunset afterparty.')).toBeVisible();
    await expect(page.getByText('Refined v2')).toBeVisible();

    // 12. Navigate back to Homepage Dashboard and verify plan in Recent Celebrations
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Recent Celebrations' })).toBeVisible();
    await expect(page.getByText("Maya & Liam's Garden Wedding")).toBeVisible();
    await expect(page.getByText('100 Attendees')).toBeVisible();

    // 13. Rename Celebration on Dashboard
    await page.getByRole('button', { name: /Rename Maya & Liam's Garden Wedding/i }).click();
    const renameInput = page.getByLabel('Edit celebration name');
    await renameInput.fill("Maya & Liam's Napa Vineyard Celebration");
    await page.getByRole('button', { name: /Save name/i }).click();

    await expect(page.getByText("Maya & Liam's Napa Vineyard Celebration")).toBeVisible();

    // 14. Delete Celebration on Dashboard
    await page.getByRole('button', { name: /Delete Maya & Liam's Napa Vineyard Celebration/i }).click();
    await page.getByRole('button', { name: /Confirm Delete/i }).click();

    // Expect empty state to reappear
    await expect(page.getByText('No celebrations planned yet')).toBeVisible();
  });
});
