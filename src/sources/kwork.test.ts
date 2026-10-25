import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseKwork } from "./kwork.js";

const html = readFileSync(new URL("./__fixtures__/kwork-projects.html", import.meta.url), "utf8");

describe("parseKwork", () => {
  it("достаёт все заказы со страницы", () => {
    expect(parseKwork(html)).toHaveLength(12);
  });

  it("правильно заполняет поля заказа", () => {
    const order = parseKwork(html)[0];
    expect(order).toMatchObject({
      source: "kwork",
      externalId: "3268226",
      title: "Писать клиентам по готовому тексту",
      budget: 500,
      url: "https://kwork.ru/projects/3268226/view",
    });
    // kwork отдаёт московское время без зоны: 14:45 МСК = 11:45 UTC
    expect(order?.publishedAt.toISOString()).toBe("2026-10-20T11:45:51.000Z");
    expect(order?.description).toContain("привлечении клиентов");
  });

  it("падает с понятной ошибкой, если вёрстка изменилась", () => {
    expect(() => parseKwork("<html><body>Новый дизайн</body></html>")).toThrow(/stateData/);
  });
});
