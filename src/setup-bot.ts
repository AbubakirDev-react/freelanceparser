// Разовая настройка бота: npm run bot:setup. Перезапускать после смены токена или адреса Supabase.
// Регистрирует вебхук (Telegram будет слать обновления в Edge Function) и меню команд у кнопки «/».
import { createHash } from "node:crypto";
import { Api } from "grammy";
import { env } from "./env.js";

const token = env("TELEGRAM_BOT_TOKEN");
const api = new Api(token);
const url = `${env("SUPABASE_URL")}/functions/v1/bot`;
// Такой же расчёт в supabase/functions/bot/index.ts: секрет заголовка = sha256 от токена.
const secretToken = createHash("sha256").update(token).digest("hex");

await api.setWebhook(url, { secret_token: secretToken, allowed_updates: ["message", "callback_query"] });
await api.setMyCommands([
  { command: "start", description: "Меню и настройки" },
  { command: "keywords", description: "Ключевые слова" },
  { command: "minbudget", description: "Минимальный бюджет" },
  { command: "help", description: "Справка" },
]);

const info = await api.getWebhookInfo();
console.log(`Вебхук: ${info.url}`);
console.log(`Ждут доставки: ${info.pending_update_count}`);
if (info.last_error_message) console.log(`Последняя ошибка: ${info.last_error_message}`);
