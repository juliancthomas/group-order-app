import { expect, test } from "@playwright/test";

function extractGroupId(url: string): string {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/\/group\/([^/]+)/);
  if (!match) {
    throw new Error(`Could not parse group ID from URL: ${url}`);
  }

  return match[1];
}

test("host bootstrap + invite guests + participant cap redirect", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL(/\/group\/[^/]+\?participant=/);

  const groupId = extractGroupId(page.url());

  await expect(page.getByText("Participants (1/3)")).toBeVisible();

  const firstInvitePopupPromise = page.waitForEvent("popup");
  await page.getByLabel("Guest email").fill("guest.one@example.com");
  await page.getByRole("button", { name: "Open Invite Tab" }).click();

  const firstGuest = await firstInvitePopupPromise;
  await firstGuest.waitForURL(new RegExp(`/group/${groupId}\\?participant=`));
  await expect(firstGuest.getByText("Guest")).toBeVisible();

  const secondInvitePopupPromise = page.waitForEvent("popup");
  await page.getByLabel("Guest email").fill("guest.two@example.com");
  await page.getByRole("button", { name: "Open Invite Tab" }).click();

  const secondGuest = await secondInvitePopupPromise;
  await secondGuest.waitForURL(new RegExp(`/group/${groupId}\\?participant=`));
  await expect(secondGuest.getByText("Guest")).toBeVisible();

  const overflowInvite = await page.context().newPage();
  await overflowInvite.goto(`/group/${groupId}?invite=guest.three@example.com`);
  await overflowInvite.waitForURL(/\/full\?group=/);

  await expect(overflowInvite.getByText("Locker Room is Full")).toBeVisible();

  await firstGuest.close();
  await secondGuest.close();
  await overflowInvite.close();
});
