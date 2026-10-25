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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
