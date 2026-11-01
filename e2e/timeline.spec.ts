import { test, expect } from '@playwright/test';

test.describe('CelebrAI Timeline Planner Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('navigates from sidebar to timeline planner and shows empty state', async ({ page }) => {
    await page.goto('/');

    // Click Timeline Planner link in sidebar
    const timelineLink = page.getByRole('link', { name: 'Timeline Planner' }).first();
    await timelineLink.click();

    // Verify URL and heading
    await expect(page).toHaveURL(/\/timeline/);
    await expect(page.getByRole('heading', { level: 1, name: 'Timeline Planner' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No Celebrations Planned Yet' })).toBeVisible();
  });

  test('initializes quick timeline, adds a milestone, toggles it, and views run sheet', async ({ page }) => {
    await page.goto('/timeline');

    // Click "Start Quick Timeline"
    await page.getByRole('button', { name: /Start Quick Timeline/i }).click();

    // Verify active tracker loaded
    await expect(page.getByText(/Live Tracker/i)).toBeVisible();
    await expect(page.getByText('My Upcoming Celebration', { exact: true })).toBeVisible();

    // Check KPI metrics exist
    await expect(page.getByText('Total Milestones')).toBeVisible();
    await expect(page.getByText('Completed Tasks')).toBeVisible();

    // Click "Add Milestone" button
    await page.getByRole('button', { name: /Add Milestone/i }).click();

    // Modal opens
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Add Preparation Milestone')).toBeVisible();

    // Fill in milestone title
    await page.getByLabel(/Milestone Title/i).fill('Book Master Sommelier');

    // Submit form
    await page.getByRole('button', { name: /Create Milestone/i }).click();

    // Verify milestone appears on timeline
    await expect(page.getByRole('heading', { name: 'Book Master Sommelier' })).toBeVisible();

    // Toggle milestone to complete
    const toggleBtn = page.getByRole('button', {
      name: /Mark milestone "Book Master Sommelier" as completed/i,
    });
    await toggleBtn.click();

    // Verify toggle state changed
    await expect(
      page.getByRole('button', {
        name: /Mark milestone "Book Master Sommelier" as pending/i,
      })
    ).toBeVisible();

    // Switch to Day-of Run Sheet tab
    await page.getByRole('button', { name: /Day-of Run Sheet/i }).click();

    // Verify day-of activities render
    await expect(page.getByRole('button', { name: /Add Activity/i })).toBeVisible();
    await expect(page.getByText('Total Duration:')).toBeVisible();
  });
});
