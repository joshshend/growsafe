import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("add child + home -> plan -> mark done -> reload persists", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Welcome to Kid-Proof" })).toBeVisible();

  await page.getByRole("link", { name: /Add your child/ }).click();
  await page.getByLabel("First name or nickname").fill("Mia");
  const now = new Date();
  // Born about 10 months ago.
  const d = new Date(now.getFullYear(), now.getMonth() - 10, 1);
  await page.getByLabel("Birth month").selectOption(String(d.getMonth() + 1));
  await page.getByLabel("Birth year").selectOption(String(d.getFullYear()));
  await page.getByRole("button", { name: "Add child" }).click();

  await page.getByRole("link", { name: /Add your home/ }).click();
  await page.getByLabel("Name of this home").fill("Test home");
  await page.getByRole("button", { name: "Add home" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Your plan" })).toBeVisible();
  const toggles = page.getByRole("button", { name: /^Done: / });
  expect(await toggles.count()).toBeGreaterThan(0);
  await expect(page.getByText("0 of").first()).toBeVisible();

  const first = toggles.first();
  const label = await first.getAttribute("aria-label");
  await first.click();
  await expect(page.getByText(/^1 of \d+ done$/).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: label!, pressed: true })).toBeVisible();
  await expect(page.getByText(/^1 of \d+ done$/).first()).toBeVisible();
});

test("demo family: plan and task detail are axe clean", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Show me a demo family" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your plan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Do first/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Poison Help/ })).toHaveAttribute(
    "href",
    "tel:+18002221222",
  );
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  // No horizontal scroll at 375px.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  await page.locator("a.task-main").first().click();
  await expect(page.getByRole("heading", { name: "Why this ranks here" })).toBeVisible();
  await expect(page.getByText(/out of 5 on our seriousness scale/)).toBeVisible();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
