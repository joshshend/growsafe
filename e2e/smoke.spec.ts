import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("onboarding -> Today -> mark done -> reload persists", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "A safer home, one small fix at a time." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Show me the first fix" }).click();
  await page.getByLabel("First name or nickname").fill("Mia");
  const d = new Date();
  d.setMonth(d.getMonth() - 10);
  await page.getByLabel("Birth month").selectOption(String(d.getMonth() + 1));
  await page.getByLabel("Birth year").selectOption(String(d.getFullYear()));
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Looks right" }).click();
  await expect(page.getByText("Right now")).toBeVisible();

  const toggles = page.getByRole("button", { name: /^Mark done: / });
  expect(await toggles.count()).toBeGreaterThan(0);
  const label = await toggles.first().getAttribute("aria-label");
  await toggles.first().click();
  await expect(page.getByText("Marked as done")).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("button", { name: label!.replace("Mark done", "Mark not done") }),
  ).toHaveCount(0); // done rows leave the Today list
  await page.getByRole("link", { name: "Rooms" }).click();
  await expect(page.getByText(/^1 of \d+ done/).first()).toBeVisible();
});

test("demo family: Today and task sheet are axe clean, no horizontal scroll", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore a sample family" }).click();
  await expect(page.getByRole("link", { name: "Emergency help" })).toHaveAttribute(
    "href",
    "#/help",
  );
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: /^(See the steps|Back to the steps)$/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
