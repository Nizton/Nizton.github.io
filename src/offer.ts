export interface WebsiteService {
  readonly title: string;
  readonly startingPriceRub: number;
  readonly description: string;
}

export interface WebsiteOffer {
  readonly startingPriceRub: number;
  readonly services?: readonly WebsiteService[];
  readonly contact?: {
    readonly label: string;
    readonly url: string;
  };
}

const services: readonly WebsiteService[] = [
  {
    title: "Одностраничный сайт",
    startingPriceRub: 5000,
    description: "Одна страница для знакомства с продуктом, услугой или идеей.",
  },
  {
    title: "Многостраничный сайт",
    startingPriceRub: 10000,
    description:
      "Несколько страниц, чтобы подробно рассказать о проекте и его предложении.",
  },
  {
    title: "Интернет-магазин",
    startingPriceRub: 20000,
    description:
      "Каталог товаров и сценарий оформления заказа. Нужные функции обсуждаются под вашу задачу.",
  },
];

export const websiteOffer: WebsiteOffer = {
  startingPriceRub: Math.min(
    ...services.map((service) => service.startingPriceRub),
  ),
  services,
  // Add contact: { label: "Написать в Telegram", url: "https://t.me/your_name" }.
};
