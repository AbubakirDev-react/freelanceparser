import { getUnnotified, markNotified, saveOrders } from "./db.js";
import { BlockedError } from "./http.js";
import { flSource } from "./sources/fl.js";
import { kworkSource } from "./sources/kwork.js";
import { sendOrder } from "./telegram.js";
import type { OrderSource } from "./types.js";

const sources: OrderSource[] = [kworkSource, flSource];
let failed = false;

// Ошибка одного источника не должна мешать остальным.
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

const pending = await getUnnotified();
for (const order of pending) {
  await sendOrder(order);
  await markNotified(order.id);
  await new Promise((r) => setTimeout(r, 1000)); // Telegram: не больше ~1 сообщения в секунду в один чат
}
console.log(`Отправлено в Telegram: ${pending.length}`);

if (failed) process.exitCode = 1;
