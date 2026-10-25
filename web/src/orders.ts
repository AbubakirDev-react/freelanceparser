import { createClient } from '@supabase/supabase-js'

// Строка таблицы orders в том виде, в каком её отдаёт Supabase (snake_case).
export type WebOrder = {
  id: number
  source: string
  title: string
  description: string
  budget: number | null
  url: string
  published_at: string
}

export type Filters = {
  query: string
  source: 'all' | 'kwork' | 'fl'
  minBudget: number
}

// Publishable-ключ можно отдавать в браузер: по правам базы он умеет только читать orders (миграция 003).
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export async function loadOrders(): Promise<WebOrder[]> {
  if (!url || !key) throw new Error('Нет VITE_SUPABASE_URL или VITE_SUPABASE_PUBLISHABLE_KEY в .env')
  const { data, error } = await createClient(url, key)
    .from('orders')
    .select('id, source, title, description, budget, url, published_at')
    .order('published_at', { ascending: false })
    .limit(300)
  if (error) throw new Error(error.message)
  return data.map((o) => ({ ...o, budget: o.budget === null ? null : Number(o.budget) }))
}

// 300 строк спокойно фильтруются в браузере, поэтому при вводе не ходим в базу заново.
export function filterOrders(orders: WebOrder[], f: Filters): WebOrder[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean)
  return orders.filter((o) => {
    if (f.source !== 'all' && o.source !== f.source) return false
    // Договорные пропускаем всегда: так же работает фильтр бота.
    if (o.budget !== null && o.budget < f.minBudget) return false
    const text = `${o.title} ${o.description}`.toLowerCase()
    return words.every((w) => text.includes(w))
  })
}

export function timeAgo(iso: string, now = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} ч назад`
  return `${Math.floor(minutes / (24 * 60))} дн назад`
}
