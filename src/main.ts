import { getSettings, getUnnotified, markNotified, saveOrders } from "./db.js";
import { matchesFilter } from "./filter.js";
import { BlockedError } from "./http.js";
import { flSource } from "./sources/fl.js";
import { kworkSource } from "./sources/kwork.js";
import { sendOrder } from "./telegram.js";
import type { OrderSource } from "./types.js";

const sources: OrderSource[] = [kworkSource, flSource];
let failed = false;

// 1. Собираем заказы. Ошибка одного источника не должна мешать остальным.
for (const source of sources) {
  try {
    const orders = await source.fetchNew();
    const added = await saveOrders(orders);
    console.log(`${source.name}: на странице ${orders.length}, новых ${added}`);
  } catch (err) {
    failed = true;
    const prefix = err instanceof BlockedError ? "ЗАБЛОКИРОВАН, остановлен" : "ошибка";
    console.error(`${source.name}: ${prefix}: ${err instanceof Error ? err.message : err}`);
  }
}

// 2. Рассылаем то, что прошло фильтр. Настройки меняются кнопками в боте.
const settings = await getSettings();
const pending = await getUnnotified();
let sent = 0;
for (const order of pending) {
  // На паузе заказы помечаем обработанными без отправки, чтобы после «Возобновить» не пришла пачка старых.
  if (!settings.paused && matchesFilter(order, settings)) {
    await sendOrder(order);
    sent++;
    await new Promise((r) => setTimeout(r, 1000)); // Telegram: не больше ~1 сообщения в секунду в один чат
  }
  await markNotified(order.id);
}
console.log(
  settings.paused
    ? `Telegram: пауза, пропущено ${pending.length}`
    : `Telegram: отправлено ${sent}, отсеяно фильтром ${pending.length - sent}. Фильтр: [${settings.keywords.join(", ")}], от ${settings.minBudget} ₽`,
);

if (failed) process.exitCode = 1;
