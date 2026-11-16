import assert from "node:assert/strict";
import { test } from "node:test";
import { websiteOffer } from "../src/offer.ts";
import type { Project } from "../src/projects.ts";
import { renderPortfolio } from "../src/render.ts";

const project: Project = {
  id: "test-project",
  title: "Тестовый сайт",
  url: "https://example.com/",
};

test("review draft stays absent while the client review list is empty", () => {
  for (const html of [
    renderPortfolio([project]),
    renderPortfolio([project], websiteOffer, []),
  ]) {
    assert.doesNotMatch(html, /id="reviews"|href="#reviews"|Отзывы клиентов/);
  }
});

test("client reviews render safely in supplied order after the work catalogue", () => {
  const html = renderPortfolio([project], websiteOffer, [
    {
      author: "Автор <первого>",
      text: 'Тестовый отзыв <script>alert("x")</script>',
    },
    { author: "Второй автор", text: "Второй тестовый отзыв." },
  ]);
  assert.match(html, /href="#reviews"/);
  assert.match(html, /aria-labelledby="reviews-title"/);
  assert.match(html, /<blockquote><p>Тестовый отзыв &lt;script&gt;/);
  assert.match(html, /<figcaption>Автор &lt;первого&gt;<\/figcaption>/);
  assert.doesNotMatch(html, /<script>/);
  assert.ok(html.indexOf('id="works"') < html.indexOf('id="reviews"'));
  assert.ok(html.indexOf('id="reviews"') < html.indexOf('id="process"'));
  assert.ok(
    html.indexOf("Автор &lt;первого&gt;") < html.indexOf("Второй автор"),
  );
});

test("incomplete client reviews are rejected before publication", () => {
  for (const review of [
    { author: " ", text: "Тестовый текст." },
    { author: "Тестовый автор", text: " " },
  ]) {
    assert.throws(() => renderPortfolio([project], websiteOffer, [review]));
  }
});

test("empty collection is honest and has no external project links", () => {
  const html = renderPortfolio([]);
  assert.match(html, /Ссылка на первый сайт ещё не добавлена/);
  assert.doesNotMatch(html, /class="project-link"/);
  assert.doesNotMatch(html, /<script/);
});

test("single project renders name, URL, description and deep link", () => {
  const html = renderPortfolio([
    { ...project, description: "Проверка описания." },
  ]);
  assert.match(html, /id="project-test-project"/);
  assert.match(html, /href="https:\/\/example.com\/"/);
  assert.match(html, /Проверка описания/);
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
  assert.equal((html.match(/<article/g) ?? []).length, 1);
});

test("project order follows the collection", () => {
  const html = renderPortfolio([
    project,
    { ...project, id: "second", title: "Второй тест" },
  ]);
  assert.ok(
    html.indexOf('id="project-test-project"') <
      html.indexOf('id="project-second"'),
  );
});

test("untrusted strings are escaped in text and attributes", () => {
  const html = renderPortfolio([
    {
      ...project,
      title: '<script>alert("x")</script>',
      description: "<img src=x onerror=alert(1)>",
    },
  ]);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<script>|<img src=x/);
});

test("unsafe protocols and embedded credentials are rejected", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///C:/secret",
    "https://user:pass@example.com",
    "not-a-url",
  ]) {
    assert.throws(() => renderPortfolio([{ ...project, url }]));
  }
});

test("invalid or duplicate IDs and empty names are rejected", () => {
  for (const id of ["", "bad id", 'bad"id', "UPPER"])
    assert.throws(() => renderPortfolio([{ ...project, id }]));
  assert.throws(() => renderPortfolio([project, project]));
  assert.throws(() => renderPortfolio([{ ...project, title: "  " }]));
});

test("preview dimensions, alternative text and source are validated", () => {
  const preview = {
    src: "/preview.webp",
    alt: "Тестовое изображение",
    width: 1440,
    height: 900,
  };
  for (const invalid of [
    { ...preview, width: 0 },
    { ...preview, height: 1.5 },
    { ...preview, alt: " " },
    { ...preview, src: "//example.com/image" },
    { ...preview, src: "javascript:alert(1)" },
  ]) {
    assert.throws(() => renderPortfolio([{ ...project, preview: invalid }]));
  }
});

test("first preview is eager, subsequent previews are lazy", () => {
  const preview = {
    src: "/preview.webp",
    alt: "Тестовое изображение",
    width: 1440,
    height: 900,
  };
  const html = renderPortfolio([
    { ...project, preview },
    { ...project, id: "second", preview },
  ]);
  assert.match(html, /fetchpriority="high" loading="eager"/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /src="\/images.js"/);
});

test("website offer renders confirmed price and honest missing contact", () => {
  const html = renderPortfolio([project], { startingPriceRub: 5000 });
  assert.match(html, /5\s000\s₽/);
  assert.match(html, /Telegram для связи ещё не добавлен/);
  assert.doesNotMatch(html, /href="https:\/\/t\.me/);
});

test("confirmed service prices render and the cover follows the lowest service price", () => {
  const html = renderPortfolio([project]);
  assert.match(html, /Одностраничный сайт/);
  assert.match(html, /Многостраничный сайт/);
  assert.match(html, /Интернет-магазин/);
  assert.match(html, /от 10\s000\s₽/);
  assert.match(html, /от 20\s000\s₽/);
  const changed = renderPortfolio([], {
    startingPriceRub: 5000,
    services: [
      {
        title: "Тестовая услуга",
        description: "Тестовое описание",
        startingPriceRub: 12000,
      },
    ],
  });
  assert.match(changed, /Создание сайтов от 12\s000\s₽/);
  assert.throws(() =>
    renderPortfolio([], {
      ...websiteOffer,
      services: [
        { title: "Тест", description: "Описание", startingPriceRub: -1 },
      ],
    }),
  );
});

test("contact can be added through offer data and is escaped and validated", () => {
  const html = renderPortfolio([project], {
    startingPriceRub: 5000,
    contact: { label: "Написать <сейчас>", url: "https://t.me/test_fixture" },
  });
  assert.match(html, /href="https:\/\/t\.me\/test_fixture"/);
  assert.match(html, /Написать &lt;сейчас&gt;/);
  assert.doesNotMatch(html, /Telegram для связи ещё не добавлен/);
  assert.throws(() =>
    renderPortfolio([], {
      startingPriceRub: 5000,
      contact: { label: "Связь", url: "javascript:alert(1)" },
    }),
  );
  for (const startingPriceRub of [0, -1, 1.5, Number.NaN])
    assert.throws(() => renderPortfolio([], { startingPriceRub }));
});

test("optional project details are escaped and their previews are validated", () => {
  const html = renderPortfolio([
    {
      ...project,
      details: [
        {
          title: "Деталь <сайта>",
          description: "Описание & контекст",
          preview: {
            src: "/detail.webp",
            alt: "Экран детали",
            width: 400,
            height: 300,
          },
        },
      ],
    },
  ]);
  assert.match(html, /Деталь &lt;сайта&gt;/);
  assert.match(html, /Описание &amp; контекст/);
  assert.match(html, /src="\/detail.webp"/);
  assert.match(html, /src="\/images.js"/);
  assert.throws(() =>
    renderPortfolio([
      { ...project, details: [{ title: "", description: "Описание" }] },
    ]),
  );
  assert.throws(() =>
    renderPortfolio([
      {
        ...project,
        details: [
          {
            title: "Деталь",
            description: "Описание",
            preview: {
              src: "javascript:alert(1)",
              alt: "Экран",
              width: 400,
              height: 300,
            },
          },
        ],
      },
    ]),
  );
});
