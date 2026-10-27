import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const SAVE_KEY = "com.nuclearunicorn.kittengame.savedata";
const M2_SAVE = readFileSync(
  new URL("./fixtures/m2-save.json", import.meta.url),
  "utf8"
);
const M5_SAVE = readFileSync(
  new URL("./fixtures/m5-save.json", import.meta.url),
  "utf8"
);

const HAN_TEXT = /[\u3400-\u9fff\uf900-\ufaff]/;

async function expectEnglishSurface(locator: Locator, surface: string) {
  const content = await locator.evaluate((root) => {
    const elements = [
      root,
      ...root.querySelectorAll("[aria-label], [title], [placeholder]"),
    ];
    return {
      text: (root as HTMLElement).innerText,
      attributes: elements.flatMap((element) =>
        ["aria-label", "title", "placeholder"]
          .map((name) => element.getAttribute(name))
          .filter((value): value is string => Boolean(value))
      ),
    };
  });

  expect(
    content.text,
    `${surface} contains untranslated visible text`
  ).not.toMatch(HAN_TEXT);
  expect(
    content.attributes.join(" "),
    `${surface} contains an untranslated accessible label`
  ).not.toMatch(HAN_TEXT);
}

async function openAppSettings(page: Page) {
  await page
    .locator('[data-app-titlebar] [role="menubar"]')
    .getByRole("menuitem")
    .first()
    .click();
  await page.locator('[data-action="open-app-settings"]').click();
}

async function openSaveManager(page: Page) {
  await page.locator('[data-action="toggle-save-actions"]').click();
  await page.locator('[data-action="open-save-manager"]').click();
}

test("renders every game surface in English without CJK text", async ({
  page,
}, testInfo) => {
  await page.addInitScript(
    ({ key, save }) => {
      localStorage.setItem("app-language", "en-US");
      localStorage.setItem(key, save);
    },
    { key: SAVE_KEY, save: M5_SAVE }
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Bonfire", level: 1 })
  ).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveTitle("Kittens Game");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");

  await expectEnglishSurface(page.locator("[data-app-titlebar]"), "titlebar");
  await expectEnglishSurface(page.locator(".kittens-game-view"), "bonfire");
  const calendarWidths = await page
    .locator('[data-action="toggle-game-calendar"]')
    .evaluate((button) => {
      const label = button.querySelector("[data-game-calendar-label]");
      if (!label) throw new Error("Calendar label is missing");
      const before = button.getBoundingClientRect().width;
      label.textContent = "Y10000 Autumn 299.1";
      const after = button.getBoundingClientRect().width;
      return { before, after };
    });
  expect(calendarWidths.after).toBeCloseTo(calendarWidths.before, 1);

  const navigationText = await page
    .locator("aside [data-game-navigation]")
    .first()
    .evaluate((navigation) => {
      const captions = Array.from(
        navigation.querySelectorAll<HTMLElement>("[data-nav-caption]")
      );
      return {
        horizontalOverflow: navigation.scrollWidth - navigation.clientWidth,
        captions: captions.map((caption) => {
          const style = getComputedStyle(caption);
          return {
            text: caption.textContent,
            clippedHorizontally: caption.scrollWidth > caption.clientWidth + 1,
            textOverflow: style.textOverflow,
            whiteSpace: style.whiteSpace,
          };
        }),
      };
    });
  expect(navigationText.horizontalOverflow).toBeLessThanOrEqual(1);
  expect(navigationText.captions).toHaveLength(10);
  for (const caption of navigationText.captions) {
    expect(caption.text?.trim()).not.toBe("");
    expect(caption.clippedHorizontally).toBe(false);
    expect(caption.textOverflow).not.toBe("ellipsis");
    expect(caption.whiteSpace).not.toBe("nowrap");
  }

  const pages = [
    ["village", "Village"],
    ["science", "Science"],
    ["workshop", "Workshop"],
    ["trade", "Trade"],
    ["religion", "Religion"],
    ["space", "Space"],
    ["time", "Time"],
    ["challenges", "Challenges"],
    ["progress", "Progress"],
    ["bonfire", "Bonfire"],
  ] as const;
  for (const [id, heading] of pages) {
    await page.locator(`[data-game-navigation] [data-nav-id="${id}"]`).click();
    await expect(
      page.getByRole("heading", { name: heading, level: 1 })
    ).toBeVisible();
    await expectEnglishSurface(page.locator(".kittens-game-view"), id);
  }

  await page.locator('[data-game-navigation] [data-nav-id="time"]').click();
  await page.getByRole("button", { name: "Start a new run" }).last().click();
  const confirmation = page.locator("[data-confirmation-dialog]");
  await expect(confirmation).toBeVisible();
  await expectEnglishSurface(confirmation, "timeline confirmation");
  await confirmation.getByRole("button", { name: "Cancel" }).click();
  await expect(confirmation).toBeHidden();

  await page.locator('[data-action="toggle-game-resources"]').click();
  const resourcePanel = page.locator("[data-resource-panel]");
  await expect(resourcePanel).toBeVisible();
  await expectEnglishSurface(resourcePanel, "resource panel");

  const popupPromise = page.waitForEvent("popup");
  await resourcePanel.locator('[data-action="open-resource-window"]').click();
  const resourceWindow = await popupPromise;
  await resourceWindow.waitForLoadState("domcontentloaded");
  await expect(resourceWindow.locator("[data-resource-window]")).toBeVisible();
  await expect(resourceWindow).toHaveTitle("Kittens Game");
  await expectEnglishSurface(
    resourceWindow.locator("[data-resource-window]"),
    "resource window"
  );
  await resourceWindow
    .getByRole("button", { name: "Close resource window" })
    .click();

  await page.locator('[data-action="toggle-game-calendar"]').click();
  const calendarPanel = page.locator("[data-game-calendar-panel]");
  await expect(calendarPanel).toBeVisible();
  await expect(page.locator("[data-game-calendar-label]")).toContainText(
    /Y\d+ (Spring|Summer|Autumn|Winter)/
  );
  await expectEnglishSurface(calendarPanel, "calendar panel");
  await page.locator('[data-action="toggle-game-calendar"]').click();

  await page.locator('[data-action="toggle-save-actions"]').click();
  const saveActions = page.locator("[data-save-actions-panel]");
  await expect(saveActions).toBeVisible();
  await expectEnglishSurface(saveActions, "save actions");
  await page.locator('[data-action="toggle-save-actions"]').click();

  await openSaveManager(page);
  const saveDialog = page.locator("[data-save-dialog]");
  await expect(saveDialog).toBeVisible();
  await expectEnglishSurface(saveDialog, "save export");
  for (const [tab, label] of [
    ["Import", "save import"],
    ["Recovery", "save recovery"],
    ["Export", "save export restored"],
  ] as const) {
    await saveDialog.getByRole("tab", { name: tab }).click();
    await expectEnglishSurface(saveDialog, label);
  }
  await page.keyboard.press("Escape");
  await expect(saveDialog).toBeHidden();

  await openAppSettings(page);
  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  await expect(settingsDialog).toBeVisible();
  await settingsDialog.getByRole("tab", { name: "Game" }).click();
  await expect(
    settingsDialog.getByRole("heading", { name: "Game settings", level: 2 })
  ).toBeVisible();
  await expectEnglishSurface(
    settingsDialog.locator("[data-game-settings-section]"),
    "game settings"
  );
  await page.keyboard.press("Escape");
  await expectEnglishSurface(page.locator("body"), "application");

  await page.setViewportSize({ width: 800, height: 600 });
  await page.locator('[data-action="open-game-navigation"]').click();
  const mobileNavigation = page.getByRole("dialog").last();
  await expect(mobileNavigation).toBeVisible();
  await expectEnglishSurface(mobileNavigation, "mobile navigation");
  await page.keyboard.press("Escape");

  await page.screenshot({
    path: ".agent/smoke/i18n-english-800x600.png",
    fullPage: false,
    animations: "disabled",
  });
  await testInfo.attach("english-ui.json", {
    body: Buffer.from(JSON.stringify({ pages, language: "en-US" }, null, 2)),
    contentType: "application/json",
  });
});

test("switches to English without resetting progress or duplicating ticks", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, save }) => {
      localStorage.setItem("app-language", "zh-CN");
      localStorage.setItem(key, save);
    },
    { key: SAVE_KEY, save: M2_SAVE }
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "营火", level: 1 })
  ).toBeVisible({
    timeout: 30_000,
  });

  const readBuildings = () =>
    page.locator("[data-building-id]").evaluateAll((elements) =>
      elements.map((element) => ({
        id: element.getAttribute("data-building-id"),
        value: element.getAttribute("data-building-enabled"),
      }))
    );
  const buildingsBefore = await readBuildings();

  await page.locator('[data-game-navigation] [data-nav-id="village"]').click();
  const farmerValueBefore = await page
    .locator('[data-job-id="farmer"]')
    .getAttribute("data-job-value");

  await page.locator('[data-game-navigation] [data-nav-id="science"]').click();
  const researchBefore = await page
    .locator("[data-research-id]")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        id: element.getAttribute("data-research-id"),
        researched: element.getAttribute("data-research-researched"),
      }))
    );

  await page.locator('[data-action="toggle-game-resources"]').click();
  const catnipBefore = Number(
    await page
      .locator('[data-resource-panel] [data-resource-id="catnip"]')
      .getAttribute("data-resource-value")
  );
  await page.locator('[data-action="toggle-game-resources"]').click();

  await openAppSettings(page);
  const settingsDialog = page.getByRole("dialog", { name: "设置" });
  await settingsDialog.getByRole("tab", { name: "通用" }).click();
  await settingsDialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "English(US)" }).click();
  await settingsDialog
    .locator("form")
    .filter({ hasText: "更换语言" })
    .getByRole("button", { name: "提交" })
    .click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page).toHaveTitle("Kittens Game");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  await page.keyboard.press("Escape");

  await page.locator('[data-game-navigation] [data-nav-id="bonfire"]').click();
  await expect(
    page.getByRole("heading", { name: "Bonfire", level: 1 })
  ).toBeVisible({ timeout: 30_000 });
  expect(await readBuildings()).toEqual(buildingsBefore);

  await page.locator('[data-game-navigation] [data-nav-id="village"]').click();
  expect(
    await page.locator('[data-job-id="farmer"]').getAttribute("data-job-value")
  ).toBe(farmerValueBefore);

  await page.locator('[data-game-navigation] [data-nav-id="science"]').click();
  expect(
    await page.locator("[data-research-id]").evaluateAll((elements) =>
      elements.map((element) => ({
        id: element.getAttribute("data-research-id"),
        researched: element.getAttribute("data-research-researched"),
      }))
    )
  ).toEqual(researchBefore);

  await page.locator('[data-action="toggle-game-resources"]').click();
  const catnipAfter = Number(
    await page
      .locator('[data-resource-panel] [data-resource-id="catnip"]')
      .getAttribute("data-resource-value")
  );
  await page.locator('[data-action="toggle-game-resources"]').click();
  expect(catnipAfter).toBeGreaterThan(catnipBefore * 0.9);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)
  ).not.toBeNull();

  await page.locator('[data-action="toggle-game-calendar"]').click();
  const readTicks = async () =>
    Number(
      await page.locator("[data-game-ticks]").getAttribute("data-game-ticks")
    );
  const ticksBefore = await readTicks();
  await page.waitForTimeout(1_200);
  const ticksAfter = await readTicks();
  expect(ticksAfter - ticksBefore).toBeGreaterThan(2);
  expect(ticksAfter - ticksBefore).toBeLessThan(9);
});
