import { expect, test, type Locator } from "@playwright/test";

const SAVE_KEY = "com.nuclearunicorn.kittengame.savedata";

async function clickMany(
  locator: Locator,
  count: number
) {
  await locator.evaluate((element, total) => {
    const button = element as HTMLElement;
    for (let index = 0; index < total; index += 1) button.click();
  }, count);
}

test("runs the native game kernel and persists resources", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.stack ?? error.message);
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
    timeout: 30_000,
  });

  const catnip = page.locator('[data-resource-id="catnip"]');
  await expect(catnip).toBeVisible();
  const before = Number(await catnip.getAttribute("data-resource-value"));

  await clickMany(
    page.getByRole("button", { name: "采集猫薄荷" }),
    500
  );

  await expect
    .poll(async () =>
      Number(await catnip.getAttribute("data-resource-value"))
    )
    .toBeGreaterThan(before);

  await clickMany(page.getByRole("button", { name: "精炼木材" }), 5);

  await expect
    .poll(async () =>
      Number(
        await page
          .locator('[data-resource-id="wood"]')
          .getAttribute("data-resource-value")
      )
    )
    .toBeGreaterThanOrEqual(5);

  const hut = page.locator('[data-building-id="hut"]');
  await expect(hut).toBeVisible();
  await hut.getByRole("button", { name: "建造小屋" }).click();
  await expect(hut).toHaveAttribute("data-building-enabled", "1");

  await page.getByRole("button", { name: "保存游戏" }).click();
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), SAVE_KEY))
    .not.toBeNull();

  const savedCatnip = Number(
    await catnip.getAttribute("data-resource-value")
  );

  await page.screenshot({
    path: ".agent/smoke/desktop-native.png",
    fullPage: false,
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
    timeout: 30_000,
  });
  await expect
    .poll(async () =>
      Number(
        await page
          .locator('[data-resource-id="catnip"]')
          .getAttribute("data-resource-value")
      )
    )
    .toBeGreaterThanOrEqual(savedCatnip);
  await expect(page.locator('[data-building-id="hut"]')).toHaveAttribute(
    "data-building-enabled",
    "1"
  );

  await page.setViewportSize({ width: 800, height: 600 });
  await page.screenshot({
    path: ".agent/smoke/800x600-native.png",
    fullPage: false,
  });
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);

  await testInfo.attach("native-diagnostics.json", {
    body: Buffer.from(
      JSON.stringify(
        { before, savedCatnip, consoleErrors, pageErrors },
        null,
        2
      )
    ),
    contentType: "application/json",
  });

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
