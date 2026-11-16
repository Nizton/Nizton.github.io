import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { expect, type Page, test } from "@playwright/test";
import type { Project } from "../src/projects.ts";
import { renderPortfolio } from "../src/render.ts";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");

// These fixtures are served only through test routes, never shipped in dist.
const firstProject: Project = {
  id: "fixture-one",
  title: "Тестовый проект",
  url: "https://example.com/",
  description:
    "Тестовое описание для проверки композиции, кириллицы и перехода на внешний сайт.",
};
const manyProjects: readonly Project[] = [
  {
    ...firstProject,
    preview: {
      src: "/fixture-preview.svg",
      alt: "Тестовое изображение для проверки кадрирования",
      width: 1440,
      height: 900,
    },
  },
  {
    ...firstProject,
    id: "fixture-long",
    title:
      "Очень длинное тестовое название сайта для проверки переноса заголовков и устойчивости адаптивной композиции",
    description:
      "ДлинноеТестовоеСловоБезПробеловДляПроверкиПереполненияНаОченьУзкихЭкранах",
  },
  {
    id: "fixture-minimal",
    title: "Минимальная запись",
    url: "http://example.org/",
  },
];

async function loadFixture(
  page: Page,
  projects: readonly Project[],
): Promise<void> {
  await page.route("http://127.0.0.1:4173/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: renderPortfolio(projects),
    }),
  );
  await page.route("**/fixture-preview.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900"><rect width="1440" height="900" fill="#d2dbcf"/><rect width="1440" height="150" fill="#38503a"/><text x="80" y="110" font-size="48" fill="white">Test image. Not portfolio content.</text></svg>',
    }),
  );
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
}

async function expectNoOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);
  for (const element of await page
    .locator(
      ":is(h1, h2, h3, h4, p, dt, dd, summary, a:not(.skip-link), img):visible",
    )
    .all()) {
    const box = await element.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(dimensions.viewport + 1);
      const contentSize = await element.evaluate((node) => ({
        label: `${node.tagName}.${node.className}`,
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth,
      }));
      expect(contentSize.scrollWidth, contentSize.label).toBeLessThanOrEqual(
        contentSize.clientWidth + 1,
      );
    }
  }
}

test("production page has no console errors, broken resources or accessibility violations", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(response.url());
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("h1")).toHaveCount(1);
  await page.addScriptTag({ path: axePath });
  const results = await page.evaluate(async () => {
    const axe = Reflect.get(window, "axe") as typeof import("axe-core");
    return axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
      },
    });
  });
  expect(results.violations).toEqual([]);
  expect(failures).toEqual([]);
});

for (const [label, projects] of [
  ["empty", []],
  ["single", [firstProject]],
  ["multiple", manyProjects],
] as const) {
  for (const [width, height] of [
    [1440, 900],
    [768, 1024],
    [390, 844],
    [320, 844],
  ] as const) {
    test(`${label} layout at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await loadFixture(page, projects);
      await expectNoOverflow(page);
      await expect(page.locator("article")).toHaveCount(projects.length);
      if (projects.length) {
        await page
          .getByRole("link", { name: "Смотреть первую работу" })
          .click();
        await expect(page.locator(".project-link").first()).toBeInViewport();
      }
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      await mkdir("artifacts/qa", { recursive: true });
      await page.screenshot({
        path: `artifacts/qa/fixture-${label}-${width}.png`,
        fullPage: true,
      });
    });
  }
}

test("breakpoints and 1920px stay contained", async ({ page }) => {
  for (const width of [607, 608, 609, 863, 864, 865, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await loadFixture(page, manyProjects);
    await expectNoOverflow(page);
  }
});

test("catalogue count and section navigation reflect real content", async ({
  page,
}) => {
  await loadFixture(page, manyProjects);
  await expect(page.locator(".project-count")).toHaveText("3");
  await expect(page.locator(".project h3")).toHaveCount(3);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Стоимость" })
    .click();
  await expect(page.locator("#pricing-title")).toBeInViewport();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Связь" })
    .click();
  await expect(page.locator("#contact-title")).toBeInViewport();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Работы", exact: true })
    .click();
  await expect(page.locator("#works-title")).toBeInViewport();
});

test("cover keeps the main action on the first screen", async ({ page }) => {
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [768, 1024],
    [390, 844],
    [320, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await loadFixture(page, [firstProject]);
    await expect(page.locator(".primary-link")).toBeInViewport({ ratio: 1 });
  }
});

test("200% text remains readable and actions remain reachable", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await loadFixture(page, manyProjects);
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    await expectNoOverflow(page);
    for (const link of await page.locator(".project-link").all()) {
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeInViewport();
    }
  }
});

test("keyboard focus, skip link, project navigation and return work", async ({
  page,
}) => {
  await loadFixture(page, [firstProject]);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "К содержимому" })).toBeFocused();
  await expect(
    page.getByRole("link", { name: "К содержимому" }),
  ).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Посмотреть цены" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#pricing-title")).toBeInViewport();
  await page.goto("/");
  await page.getByRole("link", { name: "Смотреть первую работу" }).focus();
  const primary = page.getByRole("link", { name: "Смотреть первую работу" });
  await expect(primary).toBeFocused();
  expect(
    await primary.evaluate((node) => getComputedStyle(node).outlineWidth),
  ).toBe("3px");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.locator(".project-link")).toBeFocused();
  await page.route("https://example.com/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Test destination</title>",
    }),
  );
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("https://example.com/");
  await page.goBack();
  await page.getByRole("link", { name: "В начало" }).click();
  await expect(page.locator("h1")).toBeInViewport();
});

test("reduced motion has no optional movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loadFixture(page, [firstProject]);
  expect(
    await page
      .locator(".primary-link")
      .evaluate((node) => getComputedStyle(node).transitionDuration),
  ).toBe("0s");
  await page.getByRole("link", { name: "Смотреть первую работу" }).click();
  await expect(page.locator(".project-link")).toBeInViewport();
});

test("failed preview preserves a visible direct link and helpful message", async ({
  page,
}) => {
  await loadFixture(page, [
    {
      ...firstProject,
      preview: {
        src: "/missing-test-image.webp",
        alt: "Тестовое превью",
        width: 1440,
        height: 900,
      },
    },
  ]);
  for (const preview of await page.locator("[data-preview]").all()) {
    await preview.scrollIntoViewIfNeeded();
    await expect(preview.locator(".preview-error")).toBeVisible();
  }
  await expect(page.locator(".project-link")).toBeVisible();
  await expectNoOverflow(page);
});

test("content and links remain available with JavaScript disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await loadFixture(page, manyProjects);
  await expect(page.locator(".project-link")).toHaveCount(3);
  await expect(page.locator(".project-preview img")).toBeVisible();
  await context.close();
});

test("populated states pass automated WCAG checks on desktop and phone", async ({
  page,
}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await loadFixture(page, manyProjects);
    await page.addScriptTag({ path: axePath });
    const violations = await page.evaluate(async () => {
      const axe = Reflect.get(window, "axe") as typeof import("axe-core");
      return (
        await axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
          },
        })
      ).violations;
    });
    expect(violations).toEqual([]);
  }
});

test("capture production viewports and local performance observations", async ({
  browser,
}) => {
  await mkdir("artifacts/qa", { recursive: true });
  const observations: unknown[] = [];
  for (const [width, height] of [
    [1440, 900],
    [768, 1024],
    [390, 844],
    [320, 844],
  ] as const) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      Reflect.set(window, "labMetrics", { lcp: 0, cls: 0 });
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) Reflect.get(window, "labMetrics").lcp = last.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!Reflect.get(entry, "hadRecentInput"))
            Reflect.get(window, "labMetrics").cls += Reflect.get(
              entry,
              "value",
            );
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    for (const image of await page.locator("[data-preview] img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveJSProperty("complete", true);
      expect(
        await image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
      ).toBeGreaterThan(0);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `artifacts/qa/production-${width}-full.png`,
      fullPage: true,
    });
    await page.screenshot({
      path: `artifacts/qa/production-${width}-viewport.png`,
    });
    observations.push(
      await page.evaluate(() => ({
        viewport: innerWidth,
        metrics: Reflect.get(window, "labMetrics"),
        resources: performance.getEntriesByType("resource").map((entry) => ({
          url: entry.name,
          transferSize: Reflect.get(entry, "transferSize"),
        })),
      })),
    );
    await context.close();
  }
  const { writeFile } = await import("node:fs/promises");
  await writeFile(
    "artifacts/qa/local-metrics.json",
    JSON.stringify(observations, null, 2),
  );
});

test("confirmed price, missing Telegram and optional contact remain usable", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".starting-price")).toHaveText(/от 5\s000\s₽/);
  await expect(page.locator(".service-price")).toHaveText([
    /от 5\s000\s₽/,
    /от 10\s000\s₽/,
    /от 20\s000\s₽/,
  ]);
  await expect(page.locator(".pricing-formats dt")).toHaveText([
    "Одностраничный сайт",
    "Многостраничный сайт",
    "Интернет-магазин",
  ]);
  await page.getByRole("link", { name: "Посмотреть цены" }).click();
  await expect(page.locator("#pricing-title")).toBeInViewport();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Связь" })
    .click();
  await expect(page.locator(".contact-pending")).toBeInViewport();
  await expect(page.locator('a[href*="t.me"]')).toHaveCount(0);

  await page.route("http://127.0.0.1:4173/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: renderPortfolio([firstProject], {
        startingPriceRub: 5000,
        contact: {
          label: "Написать в Telegram",
          url: "https://t.me/test_fixture",
        },
      }),
    }),
  );
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await expectNoOverflow(page);
  const contact = page.getByRole("link", { name: "Написать в Telegram" });
  await contact.scrollIntoViewIfNeeded();
  await expect(contact).toBeInViewport();
  await contact.focus();
  expect(
    await contact.evaluate((node) => getComputedStyle(node).outlineWidth),
  ).toBe("3px");
  await page.route("https://t.me/test_fixture", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Test Telegram destination</title>",
    }),
  );
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("https://t.me/test_fixture");
});

test("FAQ works with keyboard, repeated actions and 200% text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const summary = page.locator(".faq summary").first();
  await summary.scrollIntoViewIfNeeded();
  await summary.focus();
  expect(
    await summary.evaluate((node) => getComputedStyle(node).outlineWidth),
  ).toBe("3px");
  await page.keyboard.press("Enter");
  await expect(page.locator(".faq details").first()).toHaveAttribute(
    "open",
    "",
  );
  await page.keyboard.press("Space");
  await expect(page.locator(".faq details").first()).not.toHaveAttribute(
    "open",
    "",
  );
  await page.locator(".faq details").evaluateAll((nodes) =>
    nodes.forEach((node) => {
      node.setAttribute("open", "");
    }),
  );
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  await expectNoOverflow(page);
});

test("production project details and expanded FAQ reflow at narrow and zoomed sizes", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".faq details").evaluateAll((nodes) => {
      for (const node of nodes) node.setAttribute("open", "");
    });
    await expectNoOverflow(page);
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    await expectNoOverflow(page);
  }
});
