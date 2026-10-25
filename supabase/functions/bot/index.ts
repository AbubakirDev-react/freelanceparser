// Telegram-бот на вебхуке: Telegram сам присылает сюда каждое сообщение и нажатие кнопки,
// поэтому ответ приходит сразу, а не со следующим запуском cron.
import { Bot, type Context, GrammyError, webhookCallback } from "npm:grammy@1.46.0";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { type Action, handleCallback, handleText, PROMPTS, renderScreen, type Settings } from "./menu.ts";

const token = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const ownerChatId = Deno.env.get("TELEGRAM_CHAT_ID")!;
// Secret-ключ Supabase сам кладёт в окружение функции, хранить его отдельно не нужно.
const secretKey = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const db = createClient(Deno.env.get("SUPABASE_URL")!, secretKey, { auth: { persistSession: false } });

async function loadSettings(): Promise<Settings> {
  const { data, error } = await db.from("settings").select("keywords, min_budget, paused").eq("id", 1).single();
  if (error) throw new Error(`settings: ${error.message}`);
  return { keywords: data.keywords, minBudget: Number(data.min_budget), paused: data.paused };
}

async function saveSettings(update: Partial<Settings>): Promise<void> {
  const { error } = await db
    .from("settings")
    .update({
      ...(update.keywords && { keywords: update.keywords }),
      ...(update.minBudget !== undefined && { min_budget: update.minBudget }),
      ...(update.paused !== undefined && { paused: update.paused }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw new Error(`settings update: ${error.message}`);
}

const bot = new Bot(token);

// Бот публичный, но слушается только владельца. Остальным молча не отвечаем.
bot.use(async (ctx, next) => {
  if (String(ctx.chat?.id) === ownerChatId) await next();
});

// errorBoundary: ошибка логируется, а Telegram получает 200. Иначе он бы повторял тот же запрос снова и снова.
const safe = bot.errorBoundary((err) => console.error("bot error:", err.error));

safe.on("callback_query:data", async (ctx) => {
  await apply(ctx, handleCallback(ctx.callbackQuery.data, await loadSettings()));
});

safe.on("message:text", async (ctx) => {
  await apply(ctx, handleText(ctx.message.text, ctx.message.reply_to_message?.text, await loadSettings()));
});

async function apply(ctx: Context, action: Action): Promise<void> {
  if (action.update) await saveSettings(action.update);
  const isButton = Boolean(ctx.callbackQuery);

  if (action.hide) {
    // Telegram разрешает боту удалять только сообщения моложе 48 часов.
    const deleted = await ctx.deleteMessage().then(() => true, () => false);
    await ctx.answerCallbackQuery(deleted ? undefined : { text: "Telegram не даёт удалять сообщения старше 48 часов" });
    return;
  }
  if (isButton) await ctx.answerCallbackQuery(action.toast ? { text: action.toast } : undefined);
  if (action.message) await ctx.reply(action.message);
  if (action.prompt) {
    await ctx.reply(PROMPTS[action.prompt], { reply_markup: { force_reply: true, input_field_placeholder: "Ответь здесь" } });
  }
  if (action.screen) {
    const screen = renderScreen(action.screen, await loadSettings());
    const options = { parse_mode: "HTML" as const, reply_markup: { inline_keyboard: screen.keyboard } };
    // Нажатие кнопки перерисовывает то же сообщение, а не плодит новые. Так меню выглядит как приложение.
    if (isButton) await ctx.editMessageText(screen.text, options).catch(ignoreNotModified);
    else await ctx.reply(screen.text, options);
  }
}

// Нажали ту же кнопку ещё раз, и текст не поменялся: Telegram отвечает ошибкой, хотя всё в порядке.
function ignoreNotModified(err: unknown): void {
  if (!(err instanceof GrammyError && err.description.includes("message is not modified"))) throw err;
}

// Секрет вебхука выводим из токена: Telegram присылает его в заголовке, и чужие запросы отсекаются.
// Тот же расчёт делает src/setup-bot.ts при регистрации вебхука.
const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
const secretToken = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(webhookCallback(bot, "std/http", { secretToken }));
