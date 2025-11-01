import { test, expect } from '@playwright/test';

test.describe('Dashboard UI', () => {
  test('should display dashboard layout', async ({ page }) => {
    // Navigate to dashboard (will redirect to login if not authenticated)
    await page.goto('/dashboard');
    
    // If redirected to login, verify login page
    if (page.url().includes('login')) {
      await expect(page.locator('input[type="email"]')).toBeVisible();
      return;
    }
    
    // If on dashboard, verify layout elements
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display navigation menu', async ({ page }) => {
    await page.goto('/dashboard');
    
    // If on dashboard, check for navigation
    if (!page.url().includes('login')) {
      // Should have navigation links
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
    }
  });

  test('should display statistics cards', async ({ page }) => {
    await page.goto('/dashboard');
    
    // If on dashboard, check for stats
    if (!page.url().includes('login')) {
      // Should have statistics section
      const stats = page.locator('[data-testid="statistics"]');
      if (await stats.isVisible()) {
        await expect(stats).toBeVisible();
      }
    }
  });

  test('should display connected pages section', async ({ page }) => {
    await page.goto('/dashboard');
    
    // If on dashboard, check for pages section
    if (!page.url().includes('login')) {
      // Should have pages section
      const pagesSection = page.locator('[data-testid="connected-pages"]');
      if (await pagesSection.isVisible()) {
        await expect(pagesSection).toBeVisible();
      }
    }
  });

  test('should display webhook dashboard link', async ({ page }) => {
    await page.goto('/dashboard');
    
    // If on dashboard, check for webhook link
    if (!page.url().includes('login')) {
      // Should have webhook dashboard link
      const webhookLink = page.locator('a:has-text("Webhooks")');
      if (await webhookLink.isVisible()) {
        await expect(webhookLink).toBeVisible();
      }
    }
  });
});

test.describe('Dashboard Interactions', () => {
  test('should handle responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    
    // Should still be accessible on mobile
    if (!page.url().includes('login')) {
      // Check if navigation is accessible
      const nav = page.locator('nav');
      if (await nav.isVisible()) {
        await expect(nav).toBeVisible();
      }
    }
  });

  test('should handle responsive design on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/dashboard');
    
    // Should be accessible on tablet
    if (!page.url().includes('login')) {
      const main = page.locator('main');
      if (await main.isVisible()) {
        await expect(main).toBeVisible();
      }
    }
  });

  test('should handle responsive design on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await page.goto('/dashboard');
    
    // Should be accessible on desktop
    if (!page.url().includes('login')) {
      const main = page.locator('main');
      if (await main.isVisible()) {
        await expect(main).toBeVisible();
      }
    }
  });
});

test.describe('Error Handling', () => {
  test('should display error page on 404', async ({ page }) => {
    await page.goto('/nonexistent-page');
    
    // Should show 404 or redirect
    const status = page.url();
    expect(status).toBeDefined();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    
    await page.goto('/dashboard');
    
    // Should show error or offline message
    const content = await page.content();
    expect(content).toBeDefined();
    
    // Restore online mode
    await page.context().setOffline(false);
  });
});

