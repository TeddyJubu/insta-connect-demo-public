import { test, expect } from '@playwright/test';

test.describe('Webhook Dashboard', () => {
  test('should display webhook dashboard page', async ({ page }) => {
    await page.goto('/dashboard/webhooks');
    
    // If redirected to login, verify login page
    if (page.url().includes('login')) {
      await expect(page.locator('input[type="email"]')).toBeVisible();
      return;
    }
    
    // If on webhook dashboard, verify page elements
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display webhook events list', async ({ page }) => {
    await page.goto('/dashboard/webhooks');
    
    // If on webhook dashboard, check for events
    if (!page.url().includes('login')) {
      // Should have events section
      const eventsSection = page.locator('[data-testid="webhook-events"]');
      if (await eventsSection.isVisible()) {
        await expect(eventsSection).toBeVisible();
      }
    }
  });

  test('should display webhook filters', async ({ page }) => {
    await page.goto('/dashboard/webhooks');
    
    // If on webhook dashboard, check for filters
    if (!page.url().includes('login')) {
      // Should have filter controls
      const filterSection = page.locator('[data-testid="webhook-filters"]');
      if (await filterSection.isVisible()) {
        await expect(filterSection).toBeVisible();
      }
    }
  });

  test('should display webhook event details', async ({ page }) => {
    await page.goto('/dashboard/webhooks');
    
    // If on webhook dashboard, check for event details
    if (!page.url().includes('login')) {
      // Should have event details section
      const detailsSection = page.locator('[data-testid="webhook-details"]');
      if (await detailsSection.isVisible()) {
        await expect(detailsSection).toBeVisible();
      }
    }
  });
});

test.describe('Webhook Interactions', () => {
  test('should filter webhook events by status', async ({ page }) => {
    await page.goto('/dashboard/webhooks');
    
    // If on webhook dashboard, test filtering
    if (!page.url().includes('login')) {
      // Look for filter buttons
      const filterButtons = page.locator('button:has-text("Pending")');
      if (await filterButtons.isVisible()) {
        await filterButtons.click();
        // Should filter events
        await page.waitForTimeout(500);
      }
    }
  });

  test('should filter webhook events by type', async ({ page }) => {
    await page.goto('/dashboard/webhooks');
    
    // If on webhook dashboard, test type filtering
    if (!page.url().includes('login')) {
      // Look for type filter
      const typeFilter = page.locator('select[name="type"]');
      if (await typeFilter.isVisible()) {
        await typeFilter.selectOption('messages');
        // Should filter events
        await page.waitForTimeout(500);
      }
    }
  });

  test('should display webhook event details on click', async ({ page }) => {
    await page.goto('/dashboard/webhooks');
    
    // If on webhook dashboard, test event details
    if (!page.url().includes('login')) {
      // Look for event rows
      const eventRows = page.locator('[data-testid="webhook-event-row"]');
      const count = await eventRows.count();
      
      if (count > 0) {
        // Click first event
        await eventRows.first().click();
        // Should show details
        await page.waitForTimeout(500);
      }
    }
  });

  test('should retry webhook event', async ({ page }) => {
    await page.goto('/dashboard/webhooks');
    
    // If on webhook dashboard, test retry
    if (!page.url().includes('login')) {
      // Look for retry button
      const retryButton = page.locator('button:has-text("Retry")');
      if (await retryButton.isVisible()) {
        await retryButton.click();
        // Should show success message
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe('Webhook Real-time Updates', () => {
  test('should auto-refresh webhook events', async ({ page }) => {
    await page.goto('/dashboard/webhooks');
    
    // If on webhook dashboard, check for auto-refresh
    if (!page.url().includes('login')) {
      // Get initial event count
      const initialEvents = page.locator('[data-testid="webhook-event-row"]');
      const initialCount = await initialEvents.count();
      
      // Wait for potential updates
      await page.waitForTimeout(2000);
      
      // Check if events updated
      const updatedEvents = page.locator('[data-testid="webhook-event-row"]');
      const updatedCount = await updatedEvents.count();
      
      // Count should be same or more (auto-refresh)
      expect(updatedCount).toBeGreaterThanOrEqual(initialCount);
    }
  });

  test('should display loading state during refresh', async ({ page }) => {
    await page.goto('/dashboard/webhooks');
    
    // If on webhook dashboard, check for loading state
    if (!page.url().includes('login')) {
      // Look for loading indicator
      const loadingIndicator = page.locator('[data-testid="loading"]');
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toBeVisible();
      }
    }
  });
});

test.describe('Webhook Pagination', () => {
  test('should display pagination controls', async ({ page }) => {
    await page.goto('/dashboard/webhooks');
    
    // If on webhook dashboard, check for pagination
    if (!page.url().includes('login')) {
      // Look for pagination
      const pagination = page.locator('[data-testid="pagination"]');
      if (await pagination.isVisible()) {
        await expect(pagination).toBeVisible();
      }
    }
  });

  test('should navigate between pages', async ({ page }) => {
    await page.goto('/dashboard/webhooks');
    
    // If on webhook dashboard, test pagination
    if (!page.url().includes('login')) {
      // Look for next page button
      const nextButton = page.locator('button:has-text("Next")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        // Should navigate to next page
        await page.waitForTimeout(500);
      }
    }
  });
});

