import { runCommand } from "./commands.js";
import { getSettings, getUnnotified, markNotified, saveOrders, updateSettings } from "./db.js";
import { matchesFilter, type Settings } from "./filter.js";
import { BlockedError } from "./http.js";
import { flSource } from "./sources/fl.js";
import { kworkSource } from "./sources/kwork.js";
import { confirmMessages, getMyMessages, sendOrder, sendText } from "./telegram.js";
import type { OrderSource } from "./types.js";

const sources: OrderSource[] = [kworkSource, flSource];
let failed = false;

// 1. Команды бота применяем до рассылки, чтобы новые фильтры сработали уже в этом запуске.
let settings: Settings = await getSettings();
const { texts, lastUpdateId } = await getMyMessages();
for (const text of texts) {
  const result = runCommand(text, settings);
  if (!result) continue;
  if (result.update) {
    await updateSettings(result.update);
    settings = { ...settings, ...result.update };
  }
  await sendText(result.reply);
}
if (lastUpdateId !== null) await confirmMessages(lastUpdateId);
console.log(`Команд обработано: ${texts.length}. Фильтр: слова [${settings.keywords.join(", ")}], от ${settings.minBudget} ₽`);

// 2. Собираем заказы. Ошибка одного источника не должна мешать остальным.
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

// 3. Рассылаем то, что прошло фильтр.
const pending = await getUnnotified();
let sent = 0;
for (const order of pending) {
  if (matchesFilter(order, settings)) {
    await sendOrder(order);
    sent++;
    await new Promise((r) => setTimeout(r, 1000)); // Telegram: не больше ~1 сообщения в секунду в один чат
  }
  await markNotified(order.id);
}
console.log(`Telegram: отправлено ${sent}, отсеяно фильтром ${pending.length - sent}`);

if (failed) process.exitCode = 1;
