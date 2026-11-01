import { test, expect } from '@playwright/test';

test.describe('CelebrAI Dashboard & Navigation Flow', () => {
  test('renders homepage dashboard with heading, archetype cards, and empty state', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/CelebrAI/);

    // Verify main heading
    const heading = page.locator('h1');
    await expect(heading).toContainText('Plan your next memorable');

    // Verify all 3 event archetypes exist
    await expect(page.getByRole('heading', { level: 3, name: 'Wedding' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Birthday Party' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Community Event' })).toBeVisible();

    // Verify empty state for celebrations
    await expect(page.getByText('No celebrations planned yet')).toBeVisible();
  });

  test('interactively selects an event archetype and navigates to planning form', async ({ page }) => {
    await page.goto('/');

    // Click Birthday Party card
    const birthdayCard = page.locator('div[role="radio"]').nth(1);
    await birthdayCard.click();
    await expect(birthdayCard).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('Selected: Birthday Party')).toBeVisible();

    // Click primary CTA in main hero
    await page.locator('main').getByRole('link', { name: 'Plan a celebration' }).click();

    // Should navigate to /events/new?type=birthday
    await expect(page).toHaveURL(/\/events\/new\?type=birthday/);
    await expect(page.getByRole('heading', { level: 1, name: 'Plan a Celebration' })).toBeVisible();
  });

  test('configures and previews celebration parameters in new event form', async ({ page }) => {
    await page.goto('/events/new?type=wedding');

    // Fill in celebration name
    await page.getByLabel(/Celebration Name/i).fill("Maya & Liam's Garden Wedding");

    // Fill in expected guests
    await page.getByLabel(/Expected Guest Count/i).fill('100');

    // Fill in estimated budget
    await page.getByLabel(/Estimated Total Budget/i).fill('20000');

    // Submit form to preview
    await page.getByRole('button', { name: /Save & Preview Parameters/i }).click();

    // Verify preview card appears
    await expect(page.getByText('Event Parameters Saved Locally')).toBeVisible();
    await expect(page.getByText("Maya & Liam's Garden Wedding")).toBeVisible();
    await expect(page.getByText('$20,000')).toBeVisible();
  });
});
