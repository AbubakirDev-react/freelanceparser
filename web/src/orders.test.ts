import { describe, expect, it } from 'vitest'
import { filterOrders, timeAgo, type WebOrder } from './orders.ts'

const order = (patch: Partial<WebOrder>): WebOrder => ({
  id: 1,
  source: 'kwork',
  title: 'Лендинг на React',
  description: 'Нужен адаптивный сайт для кофейни',
  budget: 10000,
  url: 'https://kwork.ru/projects/1/view',
  published_at: '2026-10-25T12:00:00Z',
  ...patch,
})

const orders = [
  order({ id: 1 }),
  order({ id: 2, source: 'fl', title: 'Телеграм-бот для записи', description: 'grammY', budget: null }),
  order({ id: 3, title: 'Логотип', description: 'Векторный', budget: 2000 }),
]
const ids = (list: WebOrder[]) => list.map((o) => o.id)
const all = { query: '', source: 'all', minBudget: 0 } as const

describe('filterOrders', () => {
  it('без фильтров возвращает всё', () => {
    expect(ids(filterOrders(orders, all))).toEqual([1, 2, 3])
  })

  it('ищет по заголовку и описанию без учёта регистра', () => {
    expect(ids(filterOrders(orders, { ...all, query: 'REACT' }))).toEqual([1])
    expect(ids(filterOrders(orders, { ...all, query: 'кофейни' }))).toEqual([1])
  })

  it('несколько слов: должны найтись все', () => {
    expect(ids(filterOrders(orders, { ...all, query: 'бот записи' }))).toEqual([2])
    expect(ids(filterOrders(orders, { ...all, query: 'бот react' }))).toEqual([])
  })

  it('фильтрует по источнику', () => {
    expect(ids(filterOrders(orders, { ...all, source: 'fl' }))).toEqual([2])
  })

  it('минимальный бюджет пропускает договорные, как и бот', () => {
    expect(ids(filterOrders(orders, { ...all, minBudget: 5000 }))).toEqual([1, 2])
  })
})

describe('timeAgo', () => {
  const now = new Date('2026-10-25T12:00:00Z')
  it.each([
    ['2026-10-25T11:59:40Z', 'только что'],
    ['2026-10-25T11:55:00Z', '5 мин назад'],
    ['2026-10-25T09:00:00Z', '3 ч назад'],
    ['2026-10-23T12:00:00Z', '2 дн назад'],
  ])('%s → %s', (iso, expected) => {
    expect(timeAgo(iso, now)).toBe(expected)
  })
})
