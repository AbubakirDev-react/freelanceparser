import { Api, InlineKeyboard } from "grammy";
import { env } from "./env.js";
import type { Order } from "./types.js";

// Для отправки хватает Api: сам бот (Bot + polling) понадобится только для команд на этапе 5.
const api = new Api(env("TELEGRAM_BOT_TOKEN"));
const chatId = env("TELEGRAM_CHAT_ID");

export async function sendOrder(order: Order): Promise<void> {
  const budget = order.budget ? `${order.budget.toLocaleString("ru-RU")} ₽` : "договорная";
  const text = [
    `<b>${escapeHtml(order.title)}</b>`,
    `💰 ${budget} · ${order.source}`,
    "",
    escapeHtml(truncate(order.description, 600)),
  ].join("\n");

  await api.sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard().url("Открыть заказ", order.url),
    link_preview_options: { is_disabled: true },
  });
}

export async function sendText(text: string): Promise<void> {
  await api.sendMessage(chatId, text);
}

// Скрипт не висит постоянно, поэтому при каждом запуске забираем накопившиеся сообщения (Telegram хранит их 24 часа).
// Берём только сообщения из своего чата: бот публичный, и чужие люди не должны менять фильтры.
export async function getMyMessages(): Promise<{ texts: string[]; lastUpdateId: number | null }> {
  const updates = await api.getUpdates({ timeout: 0, allowed_updates: ["message"] });
  const texts = updates
    .filter((u) => String(u.message?.chat.id) === chatId && u.message?.text)
    .map((u) => u.message!.text!);
  return { texts, lastUpdateId: updates.at(-1)?.update_id ?? null };
}

// Запрос с offset = последний + 1 говорит Telegram «эти обработаны», и они больше не придут.
export async function confirmMessages(lastUpdateId: number): Promise<void> {
  await api.getUpdates({ offset: lastUpdateId + 1, limit: 1, timeout: 0 });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
