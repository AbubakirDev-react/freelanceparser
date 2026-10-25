import { describe, expect, it } from "vitest";
import { runCommand } from "./commands.js";

const settings = { keywords: ["react"], minBudget: 5000 };

describe("runCommand", () => {
  it("/keywords без аргументов показывает текущие слова", () => {
    const r = runCommand("/keywords", settings);
    expect(r?.update).toBeUndefined();
    expect(r?.reply).toContain("react");
  });

  it("/keywords со списком сохраняет слова в нижнем регистре, без пробелов и повторов", () => {
    expect(runCommand("/keywords React,  Сайт , бот,,сайт", settings)?.update).toEqual({
      keywords: ["react", "сайт", "бот"],
    });
  });

  it("/keywords - очищает список", () => {
    expect(runCommand("/keywords -", settings)?.update).toEqual({ keywords: [] });
  });

  it("/minbudget с числом сохраняет его, пробелы в числе допустимы", () => {
    expect(runCommand("/minbudget 10 000", settings)?.update).toEqual({ minBudget: 10000 });
    expect(runCommand("/minbudget 0", settings)?.update).toEqual({ minBudget: 0 });
  });

  it("/minbudget с мусором ничего не меняет и объясняет формат", () => {
    const r = runCommand("/minbudget много", settings);
    expect(r?.update).toBeUndefined();
    expect(r?.reply).toMatch(/\/minbudget 5000/);
  });

  it("понимает команду с именем бота (так её шлёт меню Telegram)", () => {
    expect(runCommand("/minbudget@abubakirparser_bot 3000", settings)?.update).toEqual({ minBudget: 3000 });
  });

  it("/start и /help показывают справку с текущими настройками", () => {
    expect(runCommand("/help", settings)?.reply).toContain("/keywords");
    expect(runCommand("/start", settings)?.reply).toMatch(/5\s000/); // ru-RU ставит неразрывный пробел
  });

  it("обычный текст игнорирует", () => {
    expect(runCommand("привет", settings)).toBeNull();
  });
});
