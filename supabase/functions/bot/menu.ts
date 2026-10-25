// Вся логика меню бота: чистые функции без Telegram и базы, поэтому их легко тестировать (menu.test.ts).
// Файл работает и в Deno (Edge Function), и в vitest, так что импортов у него нет.

// Копия типа из src/filter.ts: Edge Function не может импортировать код из src/.
export type Settings = { keywords: string[]; minBudget: number; paused: boolean };

export type ScreenName = "main" | "keywords" | "budget";
export type PromptName = "keywords" | "budget";
export type Button = { text: string; callback_data: string };
export type Screen = { text: string; keyboard: Button[][] };

// Что сделать в ответ на нажатие или сообщение. index.ts выполняет это по порядку.
export type Action = {
  update?: Partial<Settings>; // сохранить в settings
  toast?: string; // всплывашка над кнопкой (только для нажатий)
  message?: string; // отдельное сообщение
  prompt?: PromptName; // попросить ввести текст (ForceReply)
  screen?: ScreenName; // показать экран: для нажатий перерисовываем то же сообщение
  hide?: boolean; // удалить сообщение с заказом
};

// По тексту вопроса бот узнаёт, на что пришёл ответ: так не нужно хранить «состояние диалога».
export const PROMPTS: Record<PromptName, string> = {
  keywords: "Пришли слова через запятую, например: react, лендинг, телеграм-бот",
  budget: "Пришли минимальный бюджет в рублях, например: 7000",
};

const BUDGET_PRESETS = [0, 1000, 3000, 5000, 10000, 30000];

export function renderScreen(name: ScreenName, s: Settings): Screen {
  switch (name) {
    case "main":
      return {
        text: [
          "<b>📡 Order Radar</b>",
          "",
          s.paused ? "⏸ <b>на паузе</b>: новые заказы не присылаю" : "🟢 Присылаю новые заказы",
          `🔑 Слова: ${s.keywords.length ? escapeHtml(s.keywords.join(", ")) : "все заказы"}`,
          `💰 Бюджет: ${s.minBudget ? `от ${rub(s.minBudget)}` : "любой"}`,
          "",
          "<i>kwork и fl.ru, проверка каждые 10 минут</i>",
        ].join("\n"),
        keyboard: [
          [btn("🔑 Ключевые слова", "kw"), btn("💰 Бюджет", "bd")],
          [s.paused ? btn("▶️ Возобновить", "resume") : btn("⏸ Пауза", "pause")],
        ],
      };
    case "keywords": {
      const wordButtons = s.keywords.map((k, i) => btn(`❌ ${k}`, `kw:del:${i}`));
      return {
        text: [
          "<b>🔑 Ключевые слова</b>",
          "",
          "Присылаю заказы, где есть хотя бы одно слово. Ищу по части слова: «сайт» найдёт и «сайта».",
          "",
          s.keywords.length
            ? `Сейчас: ${escapeHtml(s.keywords.join(", "))}\nНажми на слово, чтобы убрать его.`
            : "Сейчас слов нет, присылаю все заказы.",
        ].join("\n"),
        keyboard: [
          ...chunk(wordButtons, 2),
          s.keywords.length ? [btn("➕ Добавить", "kw:add"), btn("🗑 Очистить", "kw:clear")] : [btn("➕ Добавить", "kw:add")],
          [btn("« Назад", "menu")],
        ],
      };
    }
    case "budget":
      return {
        text: [
          "<b>💰 Минимальный бюджет</b>",
          "",
          "Заказы дешевле не присылаю. Договорные приходят всегда.",
          "",
          `Сейчас: ${s.minBudget ? `от ${rub(s.minBudget)}` : "любой"}`,
        ].join("\n"),
        keyboard: [
          ...chunk(
            BUDGET_PRESETS.map((n) => btn(`${n === s.minBudget ? "✓ " : ""}${n ? rub(n, false) : "Любой"}`, `bd:${n}`)),
            3,
          ),
          [btn("✏️ Своя сумма", "bd:custom")],
          [btn("« Назад", "menu")],
        ],
      };
  }
}

export function handleCallback(data: string, s: Settings): Action {
  if (data === "menu") return { screen: "main" };
  if (data === "kw") return { screen: "keywords" };
  if (data === "bd") return { screen: "budget" };
  if (data === "kw:add") return { prompt: "keywords" };
  if (data === "bd:custom") return { prompt: "budget" };
  if (data === "kw:clear") return { update: { keywords: [] }, screen: "keywords", toast: "Список очищен" };
  if (data === "pause") return { update: { paused: true }, screen: "main", toast: "⏸ Пауза" };
  if (data === "resume") return { update: { paused: false }, screen: "main", toast: "▶️ Снова присылаю заказы" };
  if (data === "hide") return { hide: true };

  const del = data.match(/^kw:del:(\d+)$/);
  if (del) {
    const word = s.keywords[Number(del[1])];
    // Список могли поменять с другого экрана: тогда просто показываем актуальный.
    if (word === undefined) return { screen: "keywords", toast: "Список уже изменился" };
    return { update: { keywords: s.keywords.filter((k) => k !== word) }, screen: "keywords", toast: `Убрал «${word}»` };
  }

  const budget = data.match(/^bd:(\d+)$/);
  if (budget) {
    const minBudget = Number(budget[1]);
    return { update: { minBudget }, screen: "budget", toast: minBudget ? `Бюджет от ${rub(minBudget)}` : "Любой бюджет" };
  }

  return { toast: "Кнопка устарела, открой /start" };
}

export function handleText(text: string, replyTo: string | undefined, s: Settings): Action {
  // Ответ на вопрос бота (ForceReply)
  if (replyTo === PROMPTS.keywords) {
    const added = parseKeywords(text);
    if (!added.length) return { message: "Не нашёл слов.", prompt: "keywords" };
    return { update: { keywords: [...new Set([...s.keywords, ...added])] }, screen: "keywords" };
  }
  if (replyTo === PROMPTS.budget) {
    const minBudget = parseBudget(text);
    if (minBudget === null) return { message: "Нужно целое число рублей.", prompt: "budget" };
    return { update: { minBudget }, screen: "budget" };
  }

  // Текстовые команды. Кнопки удобнее, но команды быстрее, если знаешь, что хочешь.
  const cmd = text.trim().match(/^\/(\w+)(?:@\w+)?\s*(.*)$/s);
  if (!cmd) return { screen: "main" };
  const [, name, arg = ""] = cmd;
  switch (name) {
    case "start":
    case "menu":
      return { screen: "main" };
    case "help":
      return { message: HELP, screen: "main" };
    case "keywords":
      if (!arg) return { screen: "keywords" };
      return { update: { keywords: arg === "-" ? [] : parseKeywords(arg) }, screen: "keywords" };
    case "minbudget": {
      if (!arg) return { screen: "budget" };
      const minBudget = parseBudget(arg);
      if (minBudget === null) return { message: "Нужно целое число рублей, например: /minbudget 5000" };
      return { update: { minBudget }, screen: "budget" };
    }
    default:
      return { message: "Не знаю такую команду.", screen: "main" };
  }
}

const HELP = [
  "Я присылаю новые заказы с kwork и fl.ru. Всё настраивается кнопками в /start.",
  "",
  "Быстрые команды:",
  "/keywords react, сайт: заменить список слов",
  "/keywords -: присылать всё",
  "/minbudget 5000: не присылать дешевле 5000 ₽",
].join("\n");

function parseKeywords(input: string): string[] {
  return [...new Set(input.split(/[,\n]/).map((k) => k.trim().toLowerCase()).filter(Boolean))];
}

function parseBudget(input: string): number | null {
  const cleaned = input.replace(/[\s ₽]|руб\.?|р\.?$/gi, "");
  return /^\d+$/.test(cleaned) ? Number(cleaned) : null;
}

function btn(text: string, callback_data: string): Button {
  return { text, callback_data };
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

function rub(n: number, withSign = true): string {
  return `${n.toLocaleString("ru-RU")}${withSign ? " ₽" : ""}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
