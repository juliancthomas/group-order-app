import { expect, test } from "@playwright/test";

function extractGroupId(url: string): string {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/\/group\/([^/]+)/);
  if (!match || !match[1]) {
    throw new Error(`Could not parse group ID from URL: ${url}`);
  }

  return match[1];
}

test("submit transitions all participants to tracker and survives refresh", async ({ page, context }) => {
  await page.goto("/");
  await page.waitForURL(/\/group\/[^/]+\?participant=/);
  const groupId = extractGroupId(page.url());

  const guest = await context.newPage();
  await guest.goto(`/group/${groupId}?invite=guest.tracker@example.com`);
  await guest.waitForURL(new RegExp(`/group/${groupId}\\?participant=`));

  await page.getByRole("button", { name: "Review Order" }).click();
  await page.getByRole("button", { name: "Submit Order" }).click();

  await expect(page.getByText("Order Tracker")).toBeVisible();
  await expect(guest.getByText("Order Tracker")).toBeVisible();

  await guest.reload();
  await expect(guest.getByText("Order Tracker")).toBeVisible();

  await guest.close();
});
