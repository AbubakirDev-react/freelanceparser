import type { Order } from "./types.js";

export type Settings = {
  keywords: string[]; // в нижнем регистре; пустой список = без фильтра
  minBudget: number; // 0 = без фильтра
};

// Ключевые слова ищем как подстроку: «сайт» найдёт и «сайта», и «сайтов». Для русского языка это самый простой способ.
export function matchesFilter(order: Order, settings: Settings): boolean {
  if (order.budget !== null && order.budget < settings.minBudget) return false;
  if (settings.keywords.length === 0) return true;
  const text = `${order.title} ${order.description}`.toLowerCase();
  return settings.keywords.some((k) => text.includes(k));
}
