import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";
import type { Settings } from "./filter.js";
import type { Order } from "./types.js";

// Secret-ключ обходит RLS, поэтому этот модуль живёт только на сервере.
const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false },
});

export type StoredOrder = Order & { id: number };

type OrderRow = {
  id: number;
  source: string;
  external_id: string;
  title: string;
  description: string;
  budget: number | null;
  url: string;
  published_at: string;
};

// ON CONFLICT DO NOTHING: уже известные заказы молча пропускаются, а вернутся только реально вставленные.
export async function saveOrders(orders: Order[]): Promise<number> {
  if (orders.length === 0) return 0;
  const { data, error } = await supabase
    .from("orders")
    .upsert(
      orders.map((o) => ({
        source: o.source,
        external_id: o.externalId,
        title: o.title,
        description: o.description,
        budget: o.budget,
        url: o.url,
        published_at: o.publishedAt.toISOString(),
      })),
      { onConflict: "source,external_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw new Error(`Supabase insert: ${error.message}`);
  return data.length;
}

// Берём из базы, а не из памяти: если прошлая отправка упала, заказ уйдёт в следующий запуск.
export async function getUnnotified(): Promise<StoredOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, source, external_id, title, description, budget, url, published_at")
    .is("notified_at", null)
    .order("published_at")
    .limit(50)
    .returns<OrderRow[]>();
  if (error) throw new Error(`Supabase select: ${error.message}`);
  return data.map((r) => ({
    id: r.id,
    source: r.source,
    externalId: r.external_id,
    title: r.title,
    description: r.description,
    budget: r.budget === null ? null : Number(r.budget),
    url: r.url,
    publishedAt: new Date(r.published_at),
  }));
}

// notified_at = «заказ обработан»: отправлен в Telegram или отсеян фильтром. В обоих случаях повторно не смотрим.
export async function markNotified(id: number): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Supabase update: ${error.message}`);
}

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase.from("settings").select("keywords, min_budget").eq("id", 1).single();
  if (error) throw new Error(`Supabase settings: ${error.message}`);
  return { keywords: data.keywords, minBudget: Number(data.min_budget) };
}

export async function updateSettings(update: Partial<Settings>): Promise<void> {
  const { error } = await supabase
    .from("settings")
    .update({
      ...(update.keywords && { keywords: update.keywords }),
      ...(update.minBudget !== undefined && { min_budget: update.minBudget }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw new Error(`Supabase settings update: ${error.message}`);
}
