import { expect, test } from "@playwright/test";

test("pharmacist can use Rai as a grounded pharmacy intelligence assistant", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Rai", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What can Rai help with?" })).toBeVisible();

  await page.getByLabel("Message Rai").fill(
    "How many unique patients are on Exforge 10/160 in March?"
  );
  await page.getByRole("button", { name: "Send message" }).click();

  const conversation = page.getByLabel("Conversation");
  await expect(conversation.getByText("3 unique patients").first()).toBeVisible();
  await expect(page.getByText("Deduplicated by patient ID").first()).toBeVisible();
  await expect(conversation.getByText("Tool used: get_unique_patients_on_medication")).toBeVisible();

  await page.getByLabel("Message Rai").fill("What should I reorder for Aprovel for seven months?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(conversation.getByText(/3,240 tablets/).first()).toBeVisible();
  await expect(conversation.getByText("Tool used: get_reorder_forecast")).toBeVisible();
});
