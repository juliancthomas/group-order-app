import { expect, test } from "@playwright/test";

function extractGroupId(url: string): string {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/\/group\/([^/]+)/);
  if (!match || !match[1]) {
    throw new Error(`Could not parse group ID from URL: ${url}`);
  }

  return match[1];
}

test("lock and unlock state propagates across tabs", async ({ page, context }) => {
  await page.goto("/");
  await page.waitForURL(/\/group\/[^/]+\?participant=/);
  const groupId = extractGroupId(page.url());

  const guest = await context.newPage();
  await guest.goto(`/group/${groupId}?invite=guest.sync@example.com`);
  await guest.waitForURL(new RegExp(`/group/${groupId}\\?participant=`));

  await page.getByRole("button", { name: "Review Order" }).click();
  await expect(page.getByText("Cart is locked for checkout review")).toBeVisible();

  await expect
    .poll(async () => guest.getByText("host is reviewing the order").isVisible())
    .toBe(true);

  await page.getByRole("button", { name: "Back to Editing" }).click();

  await expect
    .poll(async () => guest.getByText("host is reviewing the order").isVisible())
    .toBe(false);

  await guest.close();
});
