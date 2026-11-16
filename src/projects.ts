export interface ProjectPreview {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export interface Project {
  /** Stable ID also forms the section's deep link. */
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly description?: string;
  readonly preview?: ProjectPreview;
  readonly details?: readonly {
    readonly title: string;
    readonly description: string;
    readonly preview?: ProjectPreview;
  }[];
}

// Add confirmed projects here. Array order is the display order.
export const projects: readonly Project[] = [
  {
    id: "forma-detailing",
    title: "FORMA Detailing",
    url: "https://nizton.github.io/forma-detailing/",
    description:
      "Концепт сайта детейлинг-студии. Светлая редакционная композиция, крупные фотографии услуг, калькулятор стоимости и отдельное 3D-ателье с BMW M4 и Tesla Model 3.",
    preview: {
      src: "/images/forma-detailing.webp",
      alt: "Новый главный экран FORMA Detailing со светлой композицией, красным заголовком и фотографией Porsche Panamera",
      width: 1440,
      height: 900,
    },
    details: [
      {
        title: "Мобильная композиция",
        description:
          "На телефоне заголовок, основное действие и фотография идут последовательно. Услуги складываются в одну колонку, 3D-ателье загружается при приближении к своему разделу.",
        preview: {
          src: "/images/forma-phone.webp",
          alt: "Новый мобильный экран FORMA с заголовком «Чистая форма. Сильный характер.», кнопкой услуг и фотографией Porsche",
          width: 390,
          height: 844,
        },
      },
      {
        title: "Калькулятор услуг",
        description:
          "Выбор класса автомобиля и набора услуг меняет предварительную стоимость. Расчёт помогает подготовить заявку внутри концепта.",
        preview: {
          src: "/images/forma-calculator.webp",
          alt: "Реальный калькулятор FORMA с выбором услуг и предварительной стоимостью",
          width: 1440,
          height: 894,
        },
      },
    ],
  },
  {
    id: "sloy-furniture",
    title: "СЛОЙ — мебель на заказ",
    url: "https://nizton.github.io/sloy-furniture/",
    description:
      "Многостраничный концепт мебельной мастерской. Кухни, шкафы и гардеробные, подбор направления отделки и скачиваемый бриф проекта.",
    preview: {
      src: "/images/sloy-furniture.webp",
      alt: "Главный экран СЛОЙ с крупным заголовком на синем фоне и фотографией кухни с деревянными фасадами",
      width: 1440,
      height: 900,
    },
    details: [
      {
        title: "Каталог и мобильный маршрут",
        description:
          "Каждое направление получает отдельную страницу с вопросами для подготовки. На телефоне заголовок, основное действие и интерьер идут последовательно.",
        preview: {
          src: "/images/sloy-phone.webp",
          alt: "Мобильный первый экран концепта СЛОЙ с меню, заголовком, кнопкой выбора направления и фотографией кухни",
          width: 390,
          height: 844,
        },
      },
      {
        title: "Бриф, который можно сохранить",
        description:
          "Выбранные направление и отделка переходят в форму. Размеры и пожелания сохраняются в реальном текстовом файле. Приём заявок мастерской в концепте не подключён.",
        preview: {
          src: "/images/sloy-brief.webp",
          alt: "Страница подготовки брифа СЛОЙ с полями проекта и сводкой выбранных параметров",
          width: 1440,
          height: 900,
        },
      },
    ],
  },
];
