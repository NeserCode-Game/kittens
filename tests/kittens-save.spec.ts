import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const SAVE_KEY = "com.nuclearunicorn.kittengame.savedata";
const BACKUP_KEY = "com.nuclearunicorn.kittengame.savedata.backup";
const M2_SAVE = readFileSync(
  new URL("./fixtures/m2-save.json", import.meta.url),
  "utf8"
);
const M3_SAVE = readFileSync(
  new URL("./fixtures/m3-save.json", import.meta.url),
  "utf8"
);

async function installSave(page: Page, save: string) {
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: save }
  );
}

async function openSaveManager(page: Page) {
  await page.locator('[data-action="open-save-manager"]').click();
  await expect(page.locator("[data-save-dialog]")).toBeVisible();
}

async function confirmPendingAction(page: Page) {
  const confirmation = page.locator("[data-confirmation-dialog]");
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "确认" }).click();
  await expect(confirmation).toBeHidden();
}

async function readStableState(page: Page) {
  return page.evaluate(() => ({
    farmer: Number(
      document
        .querySelector('[data-job-id="farmer"]')
        ?.getAttribute("data-job-value")
    ),
    calendarResearched:
      document
        .querySelector('[data-research-id="calendar"]')
        ?.getAttribute("data-research-researched") ?? null,
    hutEnabled:
      document
        .querySelector('[data-building-id="hut"]')
        ?.getAttribute("data-building-enabled") ?? null,
  }));
}

test("migrates version 14 saves with the upstream migration path", async ({
  page,
}) => {
  const version14Save = JSON.parse(M3_SAVE) as Record<string, unknown>;
  version14Save.saveVersion = 14;
  await installSave(page, JSON.stringify(version14Save));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
    timeout: 30_000,
  });

  await openSaveManager(page);
  const status = page.locator("[data-save-version]");
  await expect(status).toHaveAttribute("data-save-version", "15");
  await expect(status).toHaveAttribute("data-save-source-version", "14");
  await expect(status).toHaveAttribute("data-save-migrated", "true");

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "快速保存" }).click();

  await expect
    .poll(async () =>
      page.evaluate((key) => {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value).saveVersion : null;
      }, SAVE_KEY)
    )
    .toBe(15);
});

test("round-trips an exported save through the confirmation flow", async ({
  page,
}) => {
  await installSave(page, M2_SAVE);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: /^村庄/ }).click();
  const farmer = page.locator('[data-job-id="farmer"]');
  await expect(farmer).toHaveAttribute("data-job-value", "8");
  await page.locator('[data-job-assign="farmer"]').click();
  await expect(farmer).toHaveAttribute("data-job-value", "9");

  await page.getByRole("button", { name: /^科学/ }).click();
  await expect(page.locator('[data-research-id="calendar"]')).toHaveAttribute(
    "data-research-researched",
    "false"
  );
  await page.locator('[data-research-id="calendar"] button').click();
  await expect(page.locator('[data-research-id="calendar"]')).toHaveAttribute(
    "data-research-researched",
    "true"
  );

  await openSaveManager(page);
  await page.locator('[data-action="generate-save-export"]').click();
  const exported = await page.locator("[data-save-export]").inputValue();
  expect(exported.length).toBeGreaterThan(100);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /^村庄/ }).click();
  await page.locator('[data-job-assign="farmer"]').click();
  await expect(farmer).toHaveAttribute("data-job-value", "10");

  await openSaveManager(page);
  await page.getByRole("tab", { name: "导入" }).click();
  await page.locator("[data-save-import]").fill(exported);
  await page.locator('[data-action="import-save"]').click();
  await confirmPendingAction(page);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^村庄/ }).click();

  await expect(farmer).toHaveAttribute("data-job-value", "9");
  await page.getByRole("button", { name: /^科学/ }).click();
  await expect(page.locator('[data-research-id="calendar"]')).toHaveAttribute(
    "data-research-researched",
    "true"
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: /^村庄/ }).click();
  await expect(page.locator('[data-job-id="farmer"]')).toHaveAttribute(
    "data-job-value",
    "9"
  );
});

test("protects a corrupt save and recovers by importing a valid save", async ({
  page,
}) => {
  await installSave(page, "corrupt-save-data");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
    timeout: 30_000,
  });

  const game = page.locator("[data-game-paused]");
  await expect(game).toHaveAttribute("data-game-paused", "true");
  await expect(page.locator("[data-recovery-banner]")).toBeVisible();
  const original = await page.evaluate(
    (key) => localStorage.getItem(key),
    SAVE_KEY
  );
  await page.waitForTimeout(1_000);
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), SAVE_KEY))
    .toBe(original);

  await page.locator('[data-action="open-save-recovery"]').click();
  await expect(page.locator("[data-save-health]")).toHaveAttribute(
    "data-save-health",
    "corrupt"
  );
  await page.getByRole("tab", { name: "导入" }).click();
  await page.locator("[data-save-import]").fill(M2_SAVE);
  await page.locator('[data-action="import-save"]').click();
  await confirmPendingAction(page);

  await expect(page.locator("[data-recovery-banner]")).toBeHidden();
  await expect(game).toHaveAttribute("data-game-paused", "false");
  await page.keyboard.press("Escape");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator("[data-game-paused]")).toHaveAttribute(
    "data-game-paused",
    "false"
  );
});

test("cancels imports and restores a saved recovery point", async ({
  page,
}, testInfo) => {
  await installSave(page, M2_SAVE);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: /^村庄/ }).click();
  const farmer = page.locator('[data-job-id="farmer"]');
  await expect(farmer).toHaveAttribute("data-job-value", "8");

  await openSaveManager(page);
  await page.getByRole("tab", { name: "恢复" }).click();
  await page.locator('[data-action="create-save-backup"]').click();
  await expect(page.locator("[data-save-has-backup]")).toHaveAttribute(
    "data-save-has-backup",
    "true"
  );
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), BACKUP_KEY))
    .not.toBeNull();
  await page.keyboard.press("Escape");

  await page.locator('[data-job-assign="farmer"]').click();
  await expect(farmer).toHaveAttribute("data-job-value", "9");
  await page.getByRole("button", { name: "保存游戏" }).click();

  await openSaveManager(page);
  await page.getByRole("tab", { name: "恢复" }).click();
  await page.locator('[data-action="restore-save-backup"]').click();
  await confirmPendingAction(page);
  await page.keyboard.press("Escape");
  await expect(farmer).toHaveAttribute("data-job-value", "8");

  const beforeCancel = await readStableState(page);
  await openSaveManager(page);
  await page.getByRole("tab", { name: "导入" }).click();
  await page.locator("[data-save-import]").fill(M3_SAVE);
  await page.locator('[data-action="import-save"]').click();
  const confirmation = page.locator("[data-confirmation-dialog]");
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "取消" }).click();
  await expect(confirmation).toBeHidden();
  await page.keyboard.press("Escape");

  expect(await readStableState(page)).toEqual(beforeCancel);
  await page.screenshot({
    path: ".agent/smoke/m4-village-desktop.png",
    fullPage: false,
    animations: "disabled",
  });

  await testInfo.attach("m4-save-diagnostics.json", {
    body: Buffer.from(JSON.stringify({ beforeCancel }, null, 2)),
    contentType: "application/json",
  });
});

test("supports save shortcuts, dialog focus and mobile access", async ({
  page,
}) => {
  await installSave(page, M2_SAVE);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
    timeout: 30_000,
  });

  await page.keyboard.press("Control+s");
  await expect(page.locator("[data-action-feedback]")).toContainText(
    "游戏已保存"
  );

  await page.keyboard.press("Control+Shift+s");
  const dialog = page.locator("[data-save-dialog]");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(document.activeElement?.closest('[role="dialog"]'))
      )
    )
    .toBe(true);
  await page.screenshot({
    path: ".agent/smoke/m4-save-desktop.png",
    fullPage: false,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.setViewportSize({ width: 800, height: 600 });
  await page.locator('[data-action="open-save-manager"]').click();
  await expect(dialog).toBeVisible();
  await page.screenshot({
    path: ".agent/smoke/m4-save-800x600.png",
    fullPage: false,
    animations: "disabled",
  });
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});
