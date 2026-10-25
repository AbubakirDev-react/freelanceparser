import type { Settings } from "./filter.js";

export type CommandResult = { reply: string; update?: Partial<Settings> };

// Чистая функция: текст команды + текущие настройки → ответ и что поменять. Telegram и база снаружи.
export function runCommand(text: string, settings: Settings): CommandResult | null {
  const match = text.trim().match(/^\/(\w+)(?:@\w+)?\s*(.*)$/s);
  if (!match) return null;
  const [, command, arg = ""] = match;

  switch (command) {
    case "keywords": {
      if (!arg) return { reply: describeKeywords(settings.keywords) };
      const keywords = arg === "-" ? [] : [...new Set(arg.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean))];
      return { reply: `Сохранил. ${describeKeywords(keywords)}`, update: { keywords } };
    }
    case "minbudget": {
      if (!arg) return { reply: describeBudget(settings.minBudget) };
      const value = Number(arg.replace(/\s/g, ""));
      if (!Number.isInteger(value) || value < 0) {
        return { reply: "Нужно целое число рублей, например: /minbudget 5000 (0 = без ограничения)" };
      }
      return { reply: `Сохранил. ${describeBudget(value)}`, update: { minBudget: value } };
    }
    case "start":
    case "help":
      return {
        reply: [
          "Я присылаю новые заказы с kwork и fl.ru.",
          "",
          "/keywords react, сайт, бот: присылать только заказы с этими словами",
          "/keywords -: присылать всё",
          "/minbudget 5000: не присылать заказы дешевле (договорные приходят всегда)",
          "",
          "Сейчас:",
          describeKeywords(settings.keywords),
          describeBudget(settings.minBudget),
          "",
          "Команды применяются при следующей проверке заказов (раз в 5–10 минут).",
        ].join("\n"),
      };
    default:
      return { reply: "Не знаю такую команду. Список: /help" };
  }
}

function describeKeywords(keywords: string[]): string {
  return keywords.length ? `Ключевые слова: ${keywords.join(", ")}` : "Ключевые слова: не заданы (присылаю всё)";
}

function describeBudget(minBudget: number): string {
  return minBudget ? `Минимальный бюджет: ${minBudget.toLocaleString("ru-RU")} ₽` : "Минимальный бюджет: без ограничения";
}
