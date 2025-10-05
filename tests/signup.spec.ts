import { test, expect } from '@playwright/test'

test('renders signup page and form elements', async ({ page }) => {
  await page.goto('/signup')

  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()
  await expect(page.getByPlaceholder('Username')).toBeVisible()
  await expect(page.getByPlaceholder('Email')).toBeVisible()
  await expect(page.getByPlaceholder('Password (min 8 characters)')).toBeVisible()
  await expect(page.getByPlaceholder('Confirm Password')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
})


