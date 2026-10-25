import type { OrderSource } from "./types.js";

const sources: OrderSource[] = [];

for (const source of sources) {
  const orders = await source.fetchNew();
  console.log(`${source.name}: ${orders.length} заказов`);
}
console.log(`Источников подключено: ${sources.length}`);
