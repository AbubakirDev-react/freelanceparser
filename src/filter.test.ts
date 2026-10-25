import { describe, expect, it } from "vitest";
import { matchesFilter } from "./filter.js";
import type { Order } from "./types.js";

const order = (patch: Partial<Order>): Order => ({
  source: "kwork",
  externalId: "1",
  title: "Сделать лендинг на React",
  description: "Нужен адаптивный сайт",
  budget: 10000,
  url: "https://example.com",
  publishedAt: new Date(),
  ...patch,
});

describe("matchesFilter", () => {
  it("без настроек пропускает всё", () => {
    expect(matchesFilter(order({}), { keywords: [], minBudget: 0 })).toBe(true);
  });

  it("ищет ключевое слово в заголовке и описании без учёта регистра", () => {
    expect(matchesFilter(order({}), { keywords: ["react"], minBudget: 0 })).toBe(true);
    expect(matchesFilter(order({}), { keywords: ["сайт"], minBudget: 0 })).toBe(true);
  });

  it("отсекает заказ без ключевых слов", () => {
    expect(matchesFilter(order({}), { keywords: ["python", "бот"], minBudget: 0 })).toBe(false);
  });

  it("отсекает заказ с бюджетом ниже минимального", () => {
    expect(matchesFilter(order({ budget: 3000 }), { keywords: [], minBudget: 5000 })).toBe(false);
    expect(matchesFilter(order({ budget: 5000 }), { keywords: [], minBudget: 5000 })).toBe(true);
  });

  it("пропускает договорной бюджет: его нельзя сравнить, а такие заказы часто хорошие", () => {
    expect(matchesFilter(order({ budget: null }), { keywords: [], minBudget: 5000 })).toBe(true);
  });

  it("требует выполнения обоих условий", () => {
    expect(matchesFilter(order({ budget: 3000 }), { keywords: ["react"], minBudget: 5000 })).toBe(false);
  });
});
