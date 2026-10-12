import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("emergency card, medicine check and briefing are axe clean at phone width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "See an example" }).click();
  for (const hash of ["emergency/demo-mia", "medicine/demo-home", "briefing/demo-home"]) {
    await page.goto(`/#/${hash}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }
});
