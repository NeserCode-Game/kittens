import { expect, test, type Locator } from "@playwright/test";
import { readFileSync } from "node:fs";

const SAVE_KEY = "com.nuclearunicorn.kittengame.savedata";
const M2_SAVE = readFileSync(
  new URL("./fixtures/m2-save.json", import.meta.url),
  "utf8"
);
const M3_SAVE = readFileSync(
  new URL("./fixtures/m3-save.json", import.meta.url),
  "utf8"
);
const M5_SAVE = readFileSync(
  new URL("./fixtures/m5-save.json", import.meta.url),
  "utf8"
);

async function clickMany(locator: Locator, count: number) {
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

  await clickMany(page.getByRole("button", { name: "采集猫薄荷" }), 500);

  await expect
    .poll(async () => Number(await catnip.getAttribute("data-resource-value")))
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

  const savedCatnip = Number(await catnip.getAttribute("data-resource-value"));

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

test("drives village, research, workshop, upgrades and settings", async ({
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

  await page.addInitScript(
    ({ key, save }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, save);
    },
    { key: SAVE_KEY, save: M2_SAVE }
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: /^村庄/ }).click();
  await expect(
    page.getByRole("heading", { name: "村庄", level: 1 })
  ).toBeVisible();
  const farmer = page.locator('[data-job-id="farmer"]');
  await expect(farmer).toHaveAttribute("data-job-value", "8");
  await page.locator('[data-job-assign="farmer"]').click();
  await expect(farmer).toHaveAttribute("data-job-value", "9");

  await page.getByRole("button", { name: /^科学/ }).click();
  await expect(
    page.getByRole("heading", { name: "科学", level: 1 })
  ).toBeVisible();
  const calendar = page.locator('[data-research-id="calendar"]');
  await expect(calendar).toHaveAttribute("data-research-researched", "false");
  await calendar.getByRole("button", { name: /^研究/ }).click();
  await expect(calendar).toHaveAttribute("data-research-researched", "true");

  await page.getByRole("tab", { name: /^政策/ }).click();
  const liberty = page.locator('[data-research-id="liberty"]');
  await expect(liberty).toBeVisible();
  await liberty.locator("button").click();
  const confirmation = page.locator('[role="dialog"]');
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "取消" }).click();
  await expect(confirmation).toBeHidden();
  await expect(liberty).toHaveAttribute("data-research-researched", "false");

  await liberty.locator("button").click();
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "确认" }).click();
  await expect(confirmation).toBeHidden();
  await expect(liberty).toHaveAttribute("data-research-researched", "true");

  await page.getByRole("button", { name: /^工坊/ }).click();
  await expect(
    page.getByRole("heading", { name: "工坊", level: 1 })
  ).toBeVisible();
  const woodBefore = Number(
    await page
      .locator('[data-resource-id="wood"]')
      .getAttribute("data-resource-value")
  );
  const beam = page.locator('[data-craft-id="beam"]');
  await expect(beam).toHaveAttribute("data-craft-can-craft", "true");
  await beam.getByRole("button", { name: /^制作/ }).first().click();
  await expect
    .poll(async () =>
      Number(
        await page
          .locator('[data-resource-id="wood"]')
          .getAttribute("data-resource-value")
      )
    )
    .toBeLessThan(woodBefore);

  const mineralHoes = page.locator('[data-upgrade-id="mineralHoes"]');
  await expect(mineralHoes).toHaveAttribute("data-upgrade-researched", "false");
  await mineralHoes.getByRole("button", { name: /^购买/ }).click();
  await expect(mineralHoes).toHaveAttribute("data-upgrade-researched", "true");

  await page.getByRole("button", { name: /^游戏设置/ }).click();
  await expect(
    page.getByRole("heading", { name: "游戏设置", level: 1 })
  ).toBeVisible();
  const precision = page.locator('[data-setting-id="forceHighPrecision"]');
  await expect(precision).toHaveAttribute("data-setting-value", "false");
  await precision.getByRole("switch").click();
  await expect(precision).toHaveAttribute("data-setting-value", "true");

  await page.getByRole("button", { name: "保存游戏" }).click();
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), SAVE_KEY))
    .not.toBeNull();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: /^村庄/ }).click();
  await expect(page.locator('[data-job-id="farmer"]')).toHaveAttribute(
    "data-job-value",
    "9"
  );
  await page.getByRole("button", { name: /^科学/ }).click();
  await expect(page.locator('[data-research-id="calendar"]')).toHaveAttribute(
    "data-research-researched",
    "true"
  );

  await page.screenshot({
    path: ".agent/smoke/m2-science-desktop.png",
    fullPage: false,
    animations: "disabled",
  });

  await page.setViewportSize({ width: 800, height: 600 });
  await page.getByRole("button", { name: "打开系统导航" }).click();
  const mobileNavigation = page.locator('[role="dialog"]');
  await expect(mobileNavigation).toBeVisible();
  await page.screenshot({
    path: ".agent/smoke/m2-800x600-navigation.png",
    fullPage: false,
    animations: "disabled",
  });
  await mobileNavigation.getByRole("button", { name: /^工坊/ }).click();
  await expect(
    page.getByRole("heading", { name: "工坊", level: 1 })
  ).toBeVisible();
  await page.screenshot({
    path: ".agent/smoke/m2-workshop-800x600.png",
    fullPage: false,
    animations: "disabled",
  });
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);

  await testInfo.attach("m2-diagnostics.json", {
    body: Buffer.from(
      JSON.stringify({ woodBefore, consoleErrors, pageErrors }, null, 2)
    ),
    contentType: "application/json",
  });

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("drives trade, religion, space, time, challenges and progress", async ({
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

  await page.addInitScript(
    ({ key, save }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, save);
    },
    { key: SAVE_KEY, save: M3_SAVE }
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: /^贸易/ }).click();
  await expect(
    page.getByRole("heading", { name: "贸易", level: 1 })
  ).toBeVisible();
  const lizardRace = page.locator('[data-trade-race-id="lizards"]');
  await expect(lizardRace).toBeVisible();
  expect(
    Number(await lizardRace.getAttribute("data-trade-max"))
  ).toBeGreaterThan(0);
  const mineralsBefore = Number(
    await page
      .locator('[data-resource-id="minerals"]')
      .getAttribute("data-resource-value")
  );
  await page.locator('[data-trade-action="lizards"]').click();
  await expect
    .poll(async () =>
      Number(
        await page
          .locator('[data-resource-id="minerals"]')
          .getAttribute("data-resource-value")
      )
    )
    .toBeLessThan(mineralsBefore);
  await expect(lizardRace).toHaveAttribute("data-trade-embassy-level", "1");
  await page.locator('[data-embassy-build="lizards"]').click();
  await expect(lizardRace).toHaveAttribute("data-trade-embassy-level", "2");

  await page.getByRole("button", { name: /^宗教/ }).click();
  await expect(
    page.getByRole("heading", { name: "宗教", level: 1 })
  ).toBeVisible();
  const religionPanel = page.locator("[data-religion-worship]");
  const worshipBefore = Number(
    await religionPanel.getAttribute("data-religion-worship")
  );
  await page.getByRole("button", { name: "赞美" }).click();
  await expect
    .poll(async () =>
      Number(await religionPanel.getAttribute("data-religion-worship"))
    )
    .toBeGreaterThan(worshipBefore);

  const unicornTomb = page.locator('[data-religion-upgrade-id="unicornTomb"]');
  await expect(unicornTomb).toHaveAttribute("data-religion-upgrade-value", "0");
  await page.locator('[data-religion-buy="unicornTomb"]').click();
  await expect(unicornTomb).toHaveAttribute("data-religion-upgrade-value", "1");

  await page.locator('[data-action="reset-faith"]').click();
  const confirmation = page.locator('[role="dialog"]');
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "取消" }).click();
  await expect(confirmation).toBeHidden();

  await page.getByRole("button", { name: /^太空/ }).click();
  await expect(
    page.getByRole("heading", { name: "太空", level: 1 })
  ).toBeVisible();
  await page.locator('[data-space-launch="orbitalLaunch"]').click();
  await expect(
    page.locator('[data-space-program-id="orbitalLaunch"]')
  ).toHaveAttribute("data-space-program-value", "1");

  await page.getByRole("tab", { name: /^行星/ }).click();
  const spaceElevator = page.locator(
    '[data-space-building-id="spaceElevator"]'
  );
  await expect(spaceElevator).toHaveAttribute("data-space-building-value", "0");
  await page.locator('[data-space-build="spaceElevator"]').click();
  await expect(spaceElevator).toHaveAttribute("data-space-building-value", "1");

  await page.getByRole("button", { name: /^时间/ }).click();
  await expect(
    page.getByRole("heading", { name: "时间", level: 1 })
  ).toBeVisible();
  const timePanel = page.locator("[data-time-heat]");
  const heatBefore = Number(await timePanel.getAttribute("data-time-heat"));
  await page.locator('[data-action="shatter-time"]').click();
  await expect
    .poll(async () => Number(await timePanel.getAttribute("data-time-heat")))
    .toBeGreaterThan(heatBefore);
  await page.locator('[data-action="toggle-time-acceleration"]').click();
  await expect(timePanel).toHaveAttribute("data-time-accelerated", "true");

  await page.getByRole("button", { name: /^挑战/ }).click();
  await expect(
    page.getByRole("heading", { name: "挑战", level: 1 })
  ).toBeVisible();
  const winterChallenge = page.locator('[data-challenge-id="winterIsComing"]');
  await page.locator('[data-challenge-toggle="winterIsComing"]').click();
  await expect(winterChallenge).toHaveAttribute(
    "data-challenge-pending",
    "true"
  );
  await page.locator('[data-action="apply-challenges"]').click();
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "取消" }).click();
  await expect(confirmation).toBeHidden();
  await page.locator('[data-challenge-toggle="winterIsComing"]').click();
  await expect(winterChallenge).toHaveAttribute(
    "data-challenge-pending",
    "false"
  );

  await page.getByRole("button", { name: /^进度/ }).click();
  await expect(
    page.getByRole("heading", { name: "进度", level: 1 })
  ).toBeVisible();
  await expect(
    page.locator('[data-achievement-id="unicornConspiracy"]')
  ).toHaveAttribute("data-achievement-unlocked", "true");
  await expect(
    page.locator('[data-achievement-id="winterIsComing"]')
  ).toHaveAttribute("data-achievement-unethical", "true");
  await expect(
    page.locator('[data-badge-id="ghostInTheMachine"]')
  ).toBeVisible();
  await page.getByRole("tab", { name: "统计" }).click();
  await expect(
    page.locator('[data-stat-group="group-0"][data-stat-id="totalTrades"]')
  ).toHaveAttribute("data-stat-unlocked", "true");

  await page.screenshot({
    path: ".agent/smoke/m3-progress-desktop.png",
    fullPage: false,
    animations: "disabled",
  });

  await page.setViewportSize({ width: 800, height: 600 });
  await page.getByRole("button", { name: "打开系统导航" }).click();
  const mobileNavigation = page.locator('[role="dialog"]');
  await expect(mobileNavigation).toBeVisible();
  await page.screenshot({
    path: ".agent/smoke/m3-800x600-navigation.png",
    fullPage: false,
    animations: "disabled",
  });
  await mobileNavigation.getByRole("button", { name: /^贸易/ }).click();
  await expect(
    page.getByRole("heading", { name: "贸易", level: 1 })
  ).toBeVisible();
  await page.screenshot({
    path: ".agent/smoke/m3-trade-800x600.png",
    fullPage: false,
    animations: "disabled",
  });
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);

  await testInfo.attach("m3-diagnostics.json", {
    body: Buffer.from(
      JSON.stringify(
        {
          mineralsBefore,
          worshipBefore,
          heatBefore,
          consoleErrors,
          pageErrors,
        },
        null,
        2
      )
    ),
    contentType: "application/json",
  });

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("previews and confirms a native timeline reset", async ({
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

  await page.addInitScript(
    ({ key, save }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, save);
    },
    { key: SAVE_KEY, save: M5_SAVE }
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: /^时间/ }).click();
  await expect(
    page.getByRole("heading", { name: "时间", level: 1 })
  ).toBeVisible();
  const resetPreview = page.locator("[data-reset-kittens]");
  await expect(resetPreview).toHaveAttribute("data-reset-kittens", "14");
  await expect(resetPreview).toHaveAttribute("data-reset-paragon", "0");
  await expect(page.locator('[data-action="reset-timeline"]')).toBeEnabled();
  await page.screenshot({
    path: ".agent/smoke/m5-reset-desktop.png",
    fullPage: false,
    animations: "disabled",
  });

  await page.setViewportSize({ width: 800, height: 600 });
  await page.getByRole("button", { name: "打开系统导航" }).click();
  const mobileNavigation = page.locator('[role="dialog"]');
  await mobileNavigation.getByRole("button", { name: /^时间/ }).click();
  await expect(
    page.getByRole("heading", { name: "时间", level: 1 })
  ).toBeVisible();
  await page.screenshot({
    path: ".agent/smoke/m5-reset-800x600.png",
    fullPage: false,
    animations: "disabled",
  });
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);

  await page.locator('[data-action="reset-timeline"]').click();
  const confirmation = page.locator("[data-confirmation-dialog]");
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText("重置时间线");
  await confirmation.getByRole("button", { name: "取消" }).click();
  await expect(confirmation).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw).stats : [];
      }, SAVE_KEY)
    )
    .not.toContainEqual(
      expect.objectContaining({ name: "totalResets", val: 1 })
    );

  await page.locator('[data-action="reset-timeline"]').click();
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "确认" }).click();
  await expect(confirmation).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const save = JSON.parse(raw);
        const stat = (name: string) =>
          save.stats.find((entry: { name: string }) => entry.name === name)
            ?.val;
        return {
          totalResets: stat("totalResets"),
          totalParagon: stat("totalParagon"),
          karmaKittens: save.game.karmaKittens,
          deadKittens: save.game.deadKittens,
          kittens: save.village.kittens.length,
        };
      }, SAVE_KEY)
    )
    .toEqual({
      totalResets: 1,
      totalParagon: 0,
      karmaKittens: 0,
      deadKittens: 0,
      kittens: 0,
    });

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "打开系统导航" }).click();
  await page
    .locator('[role="dialog"]')
    .getByRole("button", { name: /^进度/ })
    .click();
  await page.getByRole("tab", { name: "统计" }).click();
  await expect(
    page.locator('[data-stat-group="group-0"][data-stat-id="totalResets"]')
  ).toContainText("2");

  await testInfo.attach("m5-reset-diagnostics.json", {
    body: Buffer.from(JSON.stringify({ consoleErrors, pageErrors }, null, 2)),
    contentType: "application/json",
  });

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("keeps the native game readable in light and dark themes", async ({
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

  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(
    ({ key, save }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, save);
    },
    { key: SAVE_KEY, save: M3_SAVE }
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
    timeout: 30_000,
  });

  const setTheme = async (theme: "light" | "dark") => {
    await page.evaluate(
      (value) => localStorage.setItem("theme-mode", value),
      theme
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "营火" })).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForTimeout(200);
  };

  const readThemeState = () =>
    page.evaluate(() => {
      const parseColor = (color: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas context unavailable");
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
      };
      const luminance = (color: string) => {
        const [red, green, blue] = parseColor(color).map((value) => {
          const channel = value / 255;
          return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      };
      const contrast = (foreground: string, background: string) => {
        const foregroundLuminance = luminance(foreground);
        const backgroundLuminance = luminance(background);
        return Number(
          (
            (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
            (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
          ).toFixed(2)
        );
      };
      const game = document.querySelector<HTMLElement>(".kittens-game-view");
      const main = document.querySelector<HTMLElement>("#kittens-main");
      const header = game?.querySelector<HTMLElement>("header");
      const title = main?.querySelector<HTMLElement>("h1");
      const description = main?.querySelector<HTMLElement>("header p");
      const faint = main?.querySelector<HTMLElement>(".text-kg-faint");
      const activeNav = document.querySelector<HTMLElement>(
        'nav [aria-current="page"]'
      );
      const primary = main?.querySelector<HTMLElement>(
        '[data-research-id="agriculture"] button'
      );
      if (
        !game ||
        !main ||
        !header ||
        !title ||
        !description ||
        !faint ||
        !activeNav ||
        !primary
      ) {
        throw new Error("Theme probe targets are missing");
      }
      const mainBackground = getComputedStyle(main).backgroundColor;
      const titleColor = getComputedStyle(title).color;
      const descriptionColor = getComputedStyle(description).color;
      const faintColor = getComputedStyle(faint).color;
      const activeNavColor = getComputedStyle(activeNav).color;
      const sidebar = activeNav.closest("aside");
      const sidebarBackground = getComputedStyle(
        sidebar ?? activeNav.parentElement ?? activeNav
      ).backgroundColor;
      const primaryStyle = getComputedStyle(primary);

      return {
        dark: document.documentElement.classList.contains("dark"),
        colorScheme: getComputedStyle(document.documentElement).colorScheme,
        gameBackground: getComputedStyle(game).backgroundColor,
        headerBackground: getComputedStyle(header).backgroundColor,
        mainBackground,
        titleContrast: contrast(titleColor, mainBackground),
        descriptionContrast: contrast(descriptionColor, mainBackground),
        faintContrast: contrast(faintColor, mainBackground),
        activeNavContrast: contrast(activeNavColor, sidebarBackground),
        primaryContrast: contrast(
          primaryStyle.color,
          primaryStyle.backgroundColor
        ),
        overflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      };
    });

  const readDialogState = () =>
    page.evaluate(() => {
      const dialog = document.querySelector<HTMLElement>("[data-save-dialog]");
      const title = dialog?.querySelector<HTMLElement>("h2");
      if (!dialog || !title) throw new Error("Save dialog is missing");
      const dialogStyle = getComputedStyle(dialog);
      return {
        className: dialog.className,
        background: dialogStyle.backgroundColor,
        titleColor: getComputedStyle(title).color,
      };
    });

  await setTheme("light");
  await page.getByRole("button", { name: /^科学/ }).click();
  await expect(
    page.getByRole("heading", { name: "科学", level: 1 })
  ).toBeVisible();
  await page.waitForTimeout(200);
  const light = await readThemeState();
  expect(light.dark).toBe(false);
  expect(light.colorScheme).toBe("light");
  expect(light.titleContrast).toBeGreaterThanOrEqual(4.5);
  expect(light.descriptionContrast).toBeGreaterThanOrEqual(4.5);
  expect(light.faintContrast).toBeGreaterThanOrEqual(4.5);
  expect(light.activeNavContrast).toBeGreaterThanOrEqual(4.5);
  expect(light.primaryContrast).toBeGreaterThanOrEqual(4.5);
  expect(light.overflow).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: ".agent/smoke/theme-light-desktop.png",
    fullPage: false,
    animations: "disabled",
  });

  await page.locator('[data-action="open-save-manager"]').click();
  const saveDialog = page.locator("[data-save-dialog]");
  await expect(saveDialog).toBeVisible();
  await expect(saveDialog).toHaveClass(/kittens-game-theme/);
  const lightDialog = await readDialogState();
  expect(lightDialog.background).not.toBe(light.mainBackground);
  await page.screenshot({
    path: ".agent/smoke/theme-light-save-desktop.png",
    fullPage: false,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(saveDialog).toBeHidden();

  await page.setViewportSize({ width: 1024, height: 720 });
  await page.getByRole("button", { name: /^贸易/ }).click();
  await expect(
    page.getByRole("heading", { name: "贸易", level: 1 })
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
  ).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 800, height: 600 });
  await page.getByRole("button", { name: "打开系统导航" }).click();
  const mobileNavigation = page.locator('[role="dialog"]');
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation).toHaveClass(/kittens-game-theme/);
  await page.screenshot({
    path: ".agent/smoke/theme-light-navigation-800x600.png",
    fullPage: false,
    animations: "disabled",
  });
  await mobileNavigation.getByRole("button", { name: /^时间/ }).click();
  await expect(
    page.getByRole("heading", { name: "时间", level: 1 })
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
  ).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 1440, height: 900 });
  await setTheme("dark");
  await page.getByRole("button", { name: /^科学/ }).click();
  await expect(
    page.getByRole("heading", { name: "科学", level: 1 })
  ).toBeVisible();
  await page.waitForTimeout(200);
  const dark = await readThemeState();
  expect(dark.dark).toBe(true);
  expect(dark.colorScheme).toBe("dark");
  expect(dark.titleContrast).toBeGreaterThanOrEqual(4.5);
  expect(dark.descriptionContrast).toBeGreaterThanOrEqual(4.5);
  expect(dark.faintContrast).toBeGreaterThanOrEqual(4.5);
  expect(dark.activeNavContrast).toBeGreaterThanOrEqual(4.5);
  expect(dark.primaryContrast).toBeGreaterThanOrEqual(4.5);
  expect(dark.overflow).toBeLessThanOrEqual(1);
  expect(dark.gameBackground).not.toBe(light.gameBackground);
  expect(dark.headerBackground).not.toBe(light.headerBackground);
  expect(dark.mainBackground).not.toBe(light.mainBackground);
  await page.screenshot({
    path: ".agent/smoke/theme-dark-desktop.png",
    fullPage: false,
    animations: "disabled",
  });

  await page.locator('[data-action="open-save-manager"]').click();
  await expect(saveDialog).toBeVisible();
  const darkDialog = await readDialogState();
  expect(darkDialog.background).not.toBe(dark.mainBackground);
  expect(darkDialog.background).not.toBe(lightDialog.background);
  await page.screenshot({
    path: ".agent/smoke/theme-dark-save-desktop.png",
    fullPage: false,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(saveDialog).toBeHidden();

  await page.setViewportSize({ width: 1024, height: 720 });
  await page.getByRole("button", { name: /^贸易/ }).click();
  await expect(
    page.getByRole("heading", { name: "贸易", level: 1 })
  ).toBeVisible();
  await page.screenshot({
    path: ".agent/smoke/theme-dark-trade-1024x720.png",
    fullPage: false,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
  ).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 800, height: 600 });
  await page.getByRole("button", { name: "打开系统导航" }).click();
  await expect(mobileNavigation).toBeVisible();
  await page.screenshot({
    path: ".agent/smoke/theme-dark-navigation-800x600.png",
    fullPage: false,
    animations: "disabled",
  });

  await testInfo.attach("theme-diagnostics.json", {
    body: Buffer.from(
      JSON.stringify(
        { light, dark, lightDialog, darkDialog, consoleErrors, pageErrors },
        null,
        2
      )
    ),
    contentType: "application/json",
  });

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
