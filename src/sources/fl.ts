import { parse } from "node-html-parser";
import { fetchPage } from "../http.js";
import type { Order, OrderSource } from "../types.js";

// /projects/ разрешён robots.txt, а RSS (/rss/) запрещён, поэтому берём HTML. На странице 30 свежих заказов.
const LIST_URL = "https://www.fl.ru/projects/";

export function parseFl(html: string, now = new Date()): Order[] {
  const cards = parse(html).querySelectorAll('[id^="project-item"]');
  if (cards.length === 0) {
    throw new Error("fl.ru: не нашёл карточек project-item, похоже, вёрстка изменилась");
  }
  return cards.map((card) => {
    const link = card.querySelector("h2 a");
    const href = link?.getAttribute("href");
    if (!link || !href) throw new Error(`fl.ru: в карточке ${card.id} нет ссылки на заказ`);
    return {
      source: "fl",
      externalId: card.id.replace("project-item", ""),
      title: clean(link.text),
      description: clean(card.querySelector(".b-post__body .b-post__txt")?.text ?? ""),
      budget: parseBudget(card.querySelector(".b-post__price")?.text ?? ""),
      url: new URL(href, LIST_URL).href,
      publishedAt: parseRelativeTime(card.querySelector(".b-post__foot .text-gray-opacity-4")?.text ?? "", now),
    };
  });
}

export const flSource: OrderSource = {
  name: "fl",
  async fetchNew() {
    return parseFl(await fetchPage(LIST_URL));
  },
};

// «по договоренности» → null, «от 80 000 ₽» → 80000, «120 000 ₽ – 140 000 ₽» → 120000 (нижняя граница).
export function parseBudget(text: string): number | null {
  const match = text.replace(/[\s ]/g, "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

// fl.ru показывает только «2 часа 31 минуту назад», поэтому время приблизительное (до минуты).
// Незнакомый формат не считаем ошибкой: дедупликация идёт по id, а дата нужна только для сортировки.
export function parseRelativeTime(text: string, now: Date): Date {
  const units: [RegExp, number][] = [
    [/(\d+)\s*(?:день|дня|дней)/, 24 * 60],
    [/(\d+)\s*(?:час|часа|часов)/, 60],
    [/(\d+)\s*(?:минуту|минуты|минут)/, 1],
  ];
  let minutes = 0;
  for (const [re, mult] of units) {
    const m = text.match(re);
    if (m) minutes += Number(m[1]) * mult;
  }
  return new Date(now.getTime() - minutes * 60_000);
}

function clean(s: string): string {
  return s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
}
