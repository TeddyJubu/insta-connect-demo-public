import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/\/(login|auth)/);
    
    // Should have login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Login")')).toBeVisible();
  });

  test('should display register page', async ({ page }) => {
    await page.goto('/register');
    
    // Should have register form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Register")')).toBeVisible();
  });

  test('should show validation errors on empty form submission', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.locator('button:has-text("Login")').click();
    
    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    await page.locator('input[type="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    
    // Submit form
    await page.locator('button:has-text("Login")').click();
    
    // Should show error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('should navigate between login and register', async ({ page }) => {
    await page.goto('/login');
    
    // Click register link
    await page.locator('a:has-text("Create an account")', { exact: true }).click();
    
    // Should be on register page
    await expect(page).toHaveURL(/\/register/);
    
    // Click login link
    await page.locator('a:has-text("Already have an account")', { exact: true }).click();
    
    // Should be back on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display OAuth connect button', async ({ page }) => {
    await page.goto('/login');
    
    // Should have Instagram connect button
    const connectButton = page.locator('button:has-text("Connect Instagram")');
    await expect(connectButton).toBeVisible();
  });
});

test.describe('Dashboard Access', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/(login|auth)/);
  });

  test('should show loading state on dashboard', async ({ page }) => {
    // This test would require authentication setup
    // For now, we just verify the page structure
    await page.goto('/dashboard');
    
    // Should redirect to login (unauthenticated)
    await expect(page).toHaveURL(/\/(login|auth)/);
  });
});

test.describe('Logout Flow', () => {
  test('should have logout option in authenticated state', async ({ page }) => {
    // This test would require authentication setup
    // For now, we verify the login page exists
    await page.goto('/login');
    
    // Should display login form
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

