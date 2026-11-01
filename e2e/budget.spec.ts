import { test, expect } from '@playwright/test';

test.describe('CelebrAI Smart Budget Calculator Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('navigates from sidebar to budget calculator and shows empty state', async ({ page }) => {
    await page.goto('/');

    // Click Budget Calculator link in sidebar
    const budgetLink = page.getByRole('link', { name: 'Budget Calculator' }).first();
    await budgetLink.click();

    // Verify URL and heading
    await expect(page).toHaveURL(/\/budget/);
    await expect(page.getByRole('heading', { level: 1, name: 'Smart Budget Calculator' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No Budget Plans Found' })).toBeVisible();
  });

  test('initializes quick budget, adds expense, records actual cost, and adjusts contingency', async ({ page }) => {
    await page.goto('/budget');

    // Click "Start Quick Budget"
    await page.getByRole('button', { name: /Start Quick Budget/i }).click();

    // Verify active plan loaded
    await expect(page.getByText('My Upcoming Celebration', { exact: true })).toBeVisible();

    // Check KPI cards
    await expect(page.getByText('Total Budget', { exact: true })).toBeVisible();
    await expect(page.getByText('Estimated Subtotal', { exact: true })).toBeVisible();
    await expect(page.getByText('Actual Spent', { exact: true })).toBeVisible();
    await expect(page.getByText('Remaining Cushion', { exact: true })).toBeVisible();
    await expect(page.getByText('Contingency Reserve', { exact: true })).toBeVisible();

    // Verify initial expenses loaded from quick starter
    await expect(page.getByText('Main Reception Hall Rental')).toBeVisible();

    // Add a new expense
    await page.getByRole('button', { name: /Add Expense/i }).click();
    const addModal = page.getByRole('dialog', { name: /Add Budget Expense/i });
    await expect(addModal).toBeVisible();

    // Fill form
    await page.getByLabel(/Expense Name/i).fill('Live String Quartet');
    await page.getByLabel(/Estimated Cost/i).fill('1800');
    await page.getByLabel(/Vendor Name/i).fill('Harmony Ensemble');

    // Save
    await addModal.getByRole('button', { name: /Add Expense/i }).click();

    // Verify expense appears in table
    await expect(addModal).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Live String Quartet' })).toBeVisible();

    // Edit expense to record actual cost that exceeds estimate
    const editBtn = page.getByRole('button', { name: /Edit expense "Live String Quartet"/i });
    await editBtn.click();

    const editModal = page.getByRole('dialog', { name: /Edit Expense Item/i });
    await expect(editModal).toBeVisible();
    await page.getByLabel(/Actual Cost/i).fill('2200'); // $400 overrun
    await editModal.getByRole('button', { name: /Save Changes/i }).click();

    await expect(editModal).not.toBeVisible();

    // Over Estimate badge should appear for Live String Quartet
    await expect(page.getByText(/Over Estimate/i).first()).toBeVisible();

    // Adjust contingency rate
    await page.getByRole('button', { name: /Adjust Reserve/i }).click();
    const contingencyModal = page.getByRole('dialog', { name: /Adjust Contingency Reserve/i });
    await expect(contingencyModal).toBeVisible();

    // Select 15% preset
    await contingencyModal.getByRole('button', { name: /^15%$/i }).click();
    await contingencyModal.getByRole('button', { name: /Apply Reserve/i }).click();

    await expect(contingencyModal).not.toBeVisible();
    await expect(page.getByText(/15% safety cushion/i)).toBeVisible();
  });
});
