import { test, expect } from '@playwright/test';

test.describe('CelebrAI Vendor Checklist & Directory Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('navigates from sidebar to vendor checklist and shows empty state', async ({ page }) => {
    await page.goto('/');

    // Click Vendor Checklist link in sidebar
    const vendorLink = page.getByRole('link', { name: 'Vendor Checklist' }).first();
    await vendorLink.click();

    // Verify URL and heading
    await expect(page).toHaveURL(/\/vendors/);
    await expect(page.getByRole('heading', { level: 1, name: 'Vendor Checklist' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No Celebrations Planned Yet' })).toBeVisible();
  });

  test('initializes quick checklist, adds a vendor with deliverables, toggles tasks, and filters', async ({
    page,
  }) => {
    await page.goto('/vendors');

    // Click "Start Quick Checklist"
    await page.getByRole('button', { name: /Start Quick Checklist/i }).click();

    // Verify active plan loaded
    await expect(page.getByText('My Upcoming Celebration', { exact: true })).toBeVisible();

    // Check KPI cards
    await expect(page.getByTitle('Total Vendors')).toBeVisible();
    await expect(page.getByTitle('Booked Vendors')).toBeVisible();
    await expect(page.getByTitle('Outstanding Tasks')).toBeVisible();
    await expect(page.getByTitle('Overdue Tasks')).toBeVisible();

    // Verify initial vendors loaded from quick starter
    await expect(page.getByRole('heading', { name: 'Grand Ballroom & Heritage Gardens' })).toBeVisible();

    // Add a new vendor
    await page.getByRole('button', { name: /Add Vendor/i }).click();
    const vendorModal = page.getByRole('dialog', { name: /Add New Vendor/i });
    await expect(vendorModal).toBeVisible();

    // Fill form
    await vendorModal.getByLabel(/Vendor or Business Name/i).fill('Velvet Harmony Strings');
    await vendorModal.getByLabel(/Service Category/i).selectOption('entertainment');
    await vendorModal.getByLabel(/Booking Status/i).selectOption('contacted');
    await vendorModal.getByLabel(/Quoted \/ Agreed Cost/i).fill('2400');
    await vendorModal.getByLabel(/Contact Person/i).fill('Maestro Alan');

    // Save vendor
    await vendorModal.getByRole('button', { name: /Save Vendor/i }).click();

    // Verify vendor appears in directory
    await expect(vendorModal).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Velvet Harmony Strings' })).toBeVisible();

    // Toggle a deliverable task on the newly added vendor
    const toggleBtn = page.getByRole('button', {
      name: /Mark task "Request or confirm quotation" as completed/i,
    }).first();
    await toggleBtn.click();

    // Verify task is marked completed
    await expect(
      page.getByRole('button', {
        name: /Mark task "Request or confirm quotation" as pending/i,
      }).first()
    ).toBeVisible();

    // Filter by Booked status pill
    await page.getByRole('button', { name: /^Booked/i }).click();

    // "Grand Ballroom" is booked, so it should be visible; "Velvet Harmony" is contacted, so not visible
    await expect(page.getByRole('heading', { name: 'Grand Ballroom & Heritage Gardens' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Velvet Harmony Strings' })).not.toBeVisible();

    // Reset filter
    await page.getByRole('button', { name: /All Statuses/i }).click();
    await expect(page.getByRole('heading', { name: 'Velvet Harmony Strings' })).toBeVisible();

    // Change booking status to cancelled for Velvet Harmony Strings
    const statusSelect = page.getByLabel(/Change booking status for Velvet Harmony Strings/i);
    await statusSelect.selectOption('cancelled');

    // Record is preserved (not deleted) and displays CANCELLED
    await expect(page.getByRole('heading', { name: 'Velvet Harmony Strings' })).toBeVisible();
    await expect(page.getByText('CANCELLED', { exact: true })).toBeVisible();
  });
});
