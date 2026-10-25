import { describe, expect, it } from "vitest";
import { handleCallback, handleText, PROMPTS, renderScreen, type Settings } from "./menu.ts";

const settings: Settings = { keywords: ["react", "сайт"], minBudget: 3000, paused: false };
const buttons = (s: ReturnType<typeof renderScreen>) => s.keyboard.flat().map((b) => b.text);
const data = (s: ReturnType<typeof renderScreen>) => s.keyboard.flat().map((b) => b.callback_data);

describe("экраны", () => {
  it("главное меню показывает настройки и кнопку паузы", () => {
    const s = renderScreen("main", settings);
    expect(s.text).toContain("react, сайт");
    expect(s.text).toMatch(/3\s000/);
    expect(data(s)).toEqual(["kw", "bd", "pause"]);
  });

  it("на паузе вместо «Пауза» кнопка «Возобновить»", () => {
    const s = renderScreen("main", { ...settings, paused: true });
    expect(s.text).toContain("на паузе");
    expect(data(s)).toContain("resume");
  });

  it("экран слов: у каждого слова кнопка удаления по индексу", () => {
    const s = renderScreen("keywords", settings);
    expect(data(s)).toEqual(["kw:del:0", "kw:del:1", "kw:add", "kw:clear", "menu"]);
  });

  it("экран слов без слов не показывает «Очистить»", () => {
    expect(data(renderScreen("keywords", { ...settings, keywords: [] }))).toEqual(["kw:add", "menu"]);
  });

  it("экран бюджета отмечает текущую сумму галочкой", () => {
    expect(buttons(renderScreen("budget", settings))).toContainEqual(expect.stringMatching(/^✓ 3\s000$/));
  });

  it("экранирует HTML в словах пользователя", () => {
    expect(renderScreen("keywords", { ...settings, keywords: ["<b>"] }).text).toContain("&lt;b&gt;");
  });
});

describe("handleCallback", () => {
  it("удаляет слово по индексу", () => {
    expect(handleCallback("kw:del:0", settings)).toMatchObject({
      update: { keywords: ["сайт"] },
      screen: "keywords",
      toast: "Убрал «react»",
    });
  });

  it("устаревший индекс не ломает список", () => {
    expect(handleCallback("kw:del:9", settings).update).toBeUndefined();
  });

  it("кнопки бюджета, пауза и скрытие", () => {
    expect(handleCallback("bd:10000", settings).update).toEqual({ minBudget: 10000 });
    expect(handleCallback("bd:custom", settings).prompt).toBe("budget");
    expect(handleCallback("pause", settings).update).toEqual({ paused: true });
    expect(handleCallback("hide", settings).hide).toBe(true);
  });

  it("незнакомая кнопка только показывает подсказку и ничего не перерисовывает", () => {
    expect(handleCallback("что-то старое", settings)).toEqual({ toast: "Кнопка устарела, открой /start" });
  });
});

describe("handleText", () => {
  it("/start открывает главное меню", () => {
    expect(handleText("/start", undefined, settings)).toEqual({ screen: "main" });
  });

  it("ответ на запрос слов добавляет их к списку без повторов", () => {
    expect(handleText("Бот, react, вёрстка", PROMPTS.keywords, settings).update).toEqual({
      keywords: ["react", "сайт", "бот", "вёрстка"],
    });
  });

  it("ответ на запрос суммы сохраняет её, мусор просит повторить", () => {
    expect(handleText("15 000 ₽", PROMPTS.budget, settings).update).toEqual({ minBudget: 15000 });
    expect(handleText("много", PROMPTS.budget, settings)).toMatchObject({ prompt: "budget" });
  });

  it("текстовые команды тоже работают: /keywords заменяет список, /minbudget ставит сумму", () => {
    expect(handleText("/keywords@abubakirparser_bot Python, бот", undefined, settings).update).toEqual({
      keywords: ["python", "бот"],
    });
    expect(handleText("/keywords -", undefined, settings).update).toEqual({ keywords: [] });
    expect(handleText("/minbudget 5000", undefined, settings).update).toEqual({ minBudget: 5000 });
  });
});
