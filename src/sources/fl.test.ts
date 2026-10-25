import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBudget, parseFl, parseRelativeTime } from "./fl.js";

const html = readFileSync(new URL("./__fixtures__/fl-projects.html", import.meta.url), "utf8");
const now = new Date("2026-10-25T12:00:00Z");
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

describe("parseFl", () => {
  const orders = parseFl(html, now);
  const byId = (id: string) => orders.find((o) => o.externalId === id);

  it("достаёт все карточки со страницы", () => {
    expect(orders).toHaveLength(30);
  });

  it("правильно заполняет поля заказа", () => {
    expect(byId("5526636")).toMatchObject({
      source: "fl",
      title: "Авитолог для дорогой мебели",
      budget: null,
      url: "https://www.fl.ru/projects/5526636/avitolog-dlya-dorogoy-mebeli.html",
      publishedAt: minutesAgo(37),
    });
    expect(byId("5526636")?.description).toContain("авитолог для продвижения");
  });

  it("разбирает разные форматы бюджета из вёрстки", () => {
    expect(byId("5526635")?.budget).toBe(100000); // «100 000 ₽» с иконкой рубля
    expect(byId("5525209")?.budget).toBe(120000); // диапазон
    expect(byId("5523322")?.budget).toBe(80000); // «от 80 000 ₽»
  });

  it("падает с понятной ошибкой, если вёрстка изменилась", () => {
    expect(() => parseFl("<html><body>Новый дизайн</body></html>")).toThrow(/project-item/);
  });
});

describe("parseBudget", () => {
  it("«по договоренности» → null", () => {
    expect(parseBudget("по договоренности")).toBeNull();
  });
});

describe("parseRelativeTime", () => {
  it.each([
    ["37 минут назад", 37],
    ["2 часа назад", 120],
    ["2 часа 31 минуту назад", 151],
    ["5 часов 21 минуту назад", 321],
    ["3 дня назад", 3 * 24 * 60],
    ["только что", 0],
  ])("%s", (text, minutes) => {
    expect(parseRelativeTime(text, now)).toEqual(minutesAgo(minutes));
  });
});
