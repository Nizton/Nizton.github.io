import { type WebsiteOffer, websiteOffer } from "./offer.ts";
import type { Project, ProjectPreview } from "./projects.ts";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

function parseWebsiteUrl(value: string): URL {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error("Укажите публичный URL сайта с протоколом HTTP или HTTPS.");
  }
  return url;
}

function validateProjects(projects: readonly Project[]): void {
  const ids = new Set<string>();
  for (const project of projects) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.id) || ids.has(project.id)) {
      throw new Error(
        "У каждого проекта должен быть уникальный ID из латинских букв, цифр и дефисов.",
      );
    }
    ids.add(project.id);
    if (!project.title.trim())
      throw new Error(`Добавьте название проекта ${project.id}.`);
    parseWebsiteUrl(project.url);
    for (const detail of project.details ?? []) {
      if (!detail.title.trim() || !detail.description.trim())
        throw new Error(
          `Добавьте название и описание детали проекта ${project.id}.`,
        );
    }
    const previews = [
      project.preview,
      ...(project.details ?? []).map((detail) => detail.preview),
    ];
    for (const preview of previews) {
      if (!preview) continue;
      const { src, alt, width, height } = preview;
      const localImage = /^\/(?!\/)[^\\?#\s]+$/.test(src);
      if (!localImage) parseWebsiteUrl(src);
      if (
        !alt.trim() ||
        !Number.isInteger(width) ||
        !Number.isInteger(height) ||
        width <= 0 ||
        height <= 0
      ) {
        throw new Error(
          `Укажите alt и реальные размеры превью проекта ${project.id}.`,
        );
      }
    }
  }
}

function renderPreview(preview: ProjectPreview, eager = false): string {
  return `<div class="preview-media" data-preview>
    <img src="${escapeHtml(preview.src)}" alt="${escapeHtml(preview.alt)}" width="${preview.width}" height="${preview.height}" ${eager ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'} decoding="async">
    <p class="preview-error" hidden>Превью не загрузилось. Сайт можно открыть по ссылке.</p>
  </div>`;
}

function renderProject(project: Project): string {
  const website = parseWebsiteUrl(project.url);
  const title = escapeHtml(project.title);
  const preview = project.preview;
  const details = project.details ?? [];
  return `<article class="project" id="project-${project.id}" aria-labelledby="title-${project.id}">
    <div class="project-copy">
      <h3 id="title-${project.id}">${title}</h3>
      ${project.description?.trim() ? `<p class="project-description">${escapeHtml(project.description)}</p>` : ""}
      <a class="project-link" href="${escapeHtml(website.href)}">
        <span>Открыть сайт<span class="visually-hidden"> ${title}</span></span>
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M7 7h10v10" stroke="currentColor" stroke-width="1.5"/></svg>
      </a>
      <p class="project-domain">${escapeHtml(website.host)}</p>
    </div>
    ${
      preview
        ? `<figure class="project-preview">
      ${renderPreview(preview)}
    </figure>`
        : ""
    }
    ${details.length ? `<div class="project-details">${details.map((detail) => `<section class="project-detail"><div><h4>${escapeHtml(detail.title)}</h4><p>${escapeHtml(detail.description)}</p></div>${detail.preview ? `<figure>${renderPreview(detail.preview)}</figure>` : ""}</section>`).join("")}</div>` : ""}
  </article>`;
}

export function renderPortfolio(
  projects: readonly Project[],
  offer: WebsiteOffer = websiteOffer,
): string {
  validateProjects(projects);
  if (
    !Number.isSafeInteger(offer.startingPriceRub) ||
    offer.startingPriceRub <= 0
  ) {
    throw new Error(
      "Укажите положительную стартовую стоимость сайта в рублях.",
    );
  }
  if (offer.contact) {
    parseWebsiteUrl(offer.contact.url);
    if (!offer.contact.label.trim())
      throw new Error("Добавьте подпись ссылки для связи.");
  }
  for (const service of offer.services ?? []) {
    if (
      !service.title.trim() ||
      !service.description.trim() ||
      !Number.isSafeInteger(service.startingPriceRub) ||
      service.startingPriceRub <= 0
    ) {
      throw new Error(
        "Укажите название, описание и положительную стартовую цену каждой услуги.",
      );
    }
  }
  const firstProject = projects[0];
  const projectCount = new Intl.NumberFormat("ru-RU").format(projects.length);
  const currency = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  });
  const services = offer.services?.length
    ? offer.services
    : [
        {
          title: "Создание сайта",
          startingPriceRub: offer.startingPriceRub,
          description: "Формат и нужные функции определяются под вашу задачу.",
        },
      ];
  const startingPrice = currency.format(
    Math.min(...services.map((service) => service.startingPriceRub)),
  );
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#edf0e9">
  <meta name="description" content="Создаю сайты от ${escapeHtml(startingPrice)}. Узнайте стоимость и посмотрите реальные работы.">
  <title>Создание сайтов от ${escapeHtml(startingPrice)}. Мои работы</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/fonts/golos-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css">
  ${projects.some((project) => project.preview || project.details?.some((detail) => detail.preview)) ? '<script src="/images.js" defer></script>' : ""}
</head>
<body>
  <a class="skip-link" href="#main">К содержимому</a>
  <header class="site-header container">
    <span class="site-name"><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 3h12v12H3zM9 9h12v12H9z" stroke="currentColor" stroke-width="1.5"/></svg>Создание сайтов</span>
    <nav aria-label="Основная навигация"><a href="#pricing">Стоимость</a><a href="#works">Работы</a><a href="#contact">Связь</a></nav>
  </header>
  <main id="main" tabindex="-1">
    <section class="intro container${firstProject?.preview ? " intro--with-preview" : ""}" aria-labelledby="page-title">
      <div class="intro-copy">
      <h1 id="page-title"><span>Создаю</span> <span>сайты.</span></h1>
      <div class="intro-bottom">
        <p class="intro-description">Для вашего проекта, бизнеса или идеи. Стоимость начинается от ${escapeHtml(startingPrice)}.</p>
        <div class="intro-actions"><a class="primary-link" href="#pricing">Посмотреть цены</a><a class="secondary-link" href="${firstProject ? `#project-${firstProject.id}` : "#works"}">${firstProject ? "Смотреть первую работу" : "К работам"}</a></div>
      </div>
      </div>
      ${firstProject?.preview ? `<figure class="intro-preview">${renderPreview(firstProject.preview, true)}<figcaption>${escapeHtml(firstProject.title)}<span>Реальная работа</span></figcaption></figure>` : ""}
    </section>
    <section class="approach container" aria-labelledby="approach-title">
      <h2 id="approach-title">От идеи до работающей страницы</h2>
      <div class="approach-copy"><p>У сайта есть задача. Важно связать структуру, визуальную подачу и действия посетителя.</p><dl>
        <div><dt>Структура</dt><dd>Что человек узнаёт первым и как находит нужную информацию.</dd></div>
        <div><dt>Интерфейс</dt><dd>Типографика, изображения и удобная композиция на разных экранах.</dd></div>
        <div><dt>Сценарии</dt><dd>Переходы, формы и другие функции, которые нужны конкретному проекту.</dd></div>
      </dl></div>
    </section>
    <section class="pricing" id="pricing" aria-labelledby="pricing-title">
      <div class="pricing-content container">
        <div class="pricing-summary"><h2 id="pricing-title">Сколько стоит сайт</h2><p class="starting-price">от ${escapeHtml(startingPrice)}</p><p class="price-note">Выберите формат под вашу задачу. Итоговая цена зависит от объёма страниц, материалов и нужных функций.</p></div>
        <div class="pricing-formats"><h3>Формат под вашу задачу</h3><dl>
          ${services.map((service) => `<div><dt>${escapeHtml(service.title)}</dt><dd><span class="service-price">от ${escapeHtml(currency.format(service.startingPriceRub))}</span><p>${escapeHtml(service.description)}</p></dd></div>`).join("")}
        </dl></div>
      </div>
    </section>
    <section class="works container" id="works" aria-labelledby="works-title">
      <div class="section-heading"><h2 id="works-title">Работы</h2><span class="project-count" aria-label="Количество проектов">${projectCount}</span></div>
      ${
        projects.length
          ? projects.map(renderProject).join("\n")
          : `<div class="empty-state">
        <svg class="empty-symbol" aria-hidden="true" width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="m20 28 8-8m-12 4-4 4a8.5 8.5 0 0 0 12 12l4-4m-8-24 4-4a8.5 8.5 0 0 1 12 12l-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <div><h3>Первый сайт<br>ещё не добавлен.</h3>
        <p>Ссылка на первый сайт ещё не добавлена. Когда она появится, здесь можно будет посмотреть работу и открыть сайт.</p></div>
      </div>`
      }
    </section>
    <section class="process container" id="process" aria-labelledby="process-title">
      <div class="process-intro"><h2 id="process-title">Как подойти к созданию сайта</h2><p>План помогает определить объём работы. Детали и последовательность уточняются под ваш проект.</p></div>
      <ol class="process-list">
        <li><h3>Разобрать задачу</h3><p>Определить аудиторию, цель страницы и главное действие посетителя.</p></li>
        <li><h3>Собрать содержание</h3><p>Подготовить тексты, изображения и структуру. Отметить, каких материалов пока не хватает.</p></li>
        <li><h3>Спроектировать и собрать</h3><p>Связать оформление со структурой и реализовать нужные сценарии.</p></li>
        <li><h3>Проверить перед запуском</h3><p>Посмотреть мобильную версию, переходы и загрузку страниц. Уточнить домен и размещение.</p></li>
      </ol>
    </section>
    <section class="faq container" id="faq" aria-labelledby="faq-title">
      <h2 id="faq-title">Перед началом</h2>
      <div class="faq-list">
        <details><summary>Что означает цена «от»?</summary><p>У каждого формата указана стартовая стоимость. Точная цена зависит от числа страниц, готовности материалов и нужных функций. Состав работы стоит определить до начала проекта.</p></details>
        <details><summary>Можно сделать сайт, если пока нет текстов?</summary><p>Можно начать с описания задачи и списка разделов. Тексты и изображения понадобятся к сборке страниц. Их подготовку и возможную помощь с ними нужно обсудить отдельно.</p></details>
        <details><summary>3D и калькулятор входят в стартовую цену?</summary><p>В FORMA они показаны как возможности конкретной работы. Сложные интерактивные элементы имеют отдельный объём реализации, который нужно учесть в оценке вашего сайта.</p></details>
        <details><summary>Сколько времени занимает создание?</summary><p>Срок зависит от объёма сайта и готовности материалов. Его можно определить после обсуждения структуры и функций.</p></details>
        <details><summary>Что нужно для публикации сайта?</summary><p>Нужны выбранное размещение и, при необходимости, домен. Их стоимость и обслуживание стоит обсудить отдельно от разработки.</p></details>
      </div>
    </section>
    <section class="contact container" id="contact" aria-labelledby="contact-title">
      <div class="contact-intro"><h2 id="contact-title">Обсудим ваш сайт</h2>
        ${offer.contact ? `<a class="primary-link" href="${escapeHtml(parseWebsiteUrl(offer.contact.url).href)}">${escapeHtml(offer.contact.label)}</a>` : '<p class="contact-pending">Telegram для связи ещё не добавлен. Он появится здесь позже.</p>'}
      </div>
      <div class="briefing"><h3>Что подготовить к обсуждению</h3>
        <dl>
          <div><dt>Задача</dt><dd>Для кого нужен сайт и что посетитель должен на нём сделать.</dd></div>
          <div><dt>Материалы</dt><dd>Тексты, изображения и примеры сайтов, которые вам нравятся.</dd></div>
          <div><dt>Объём</dt><dd>Примерное число страниц и список нужных функций.</dd></div>
        </dl>
        </div>
    </section>
  </main>
  <footer class="site-footer container">
    <span class="footer-name">Мои сайты.</span>
    <a href="#page-title">В начало</a>
  </footer>
</body>
</html>`;
}
