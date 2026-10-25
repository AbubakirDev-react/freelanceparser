import { useCallback, useEffect, useMemo, useState } from 'react'
import { filterOrders, type Filters, loadOrders, timeAgo, type WebOrder } from './orders.ts'

const SOURCES = [
  { value: 'all', label: 'Все' },
  { value: 'kwork', label: 'kwork' },
  { value: 'fl', label: 'fl.ru' },
] as const

const BUDGETS = [0, 1000, 3000, 5000, 10000, 30000]
const REFRESH_MS = 60_000

const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`

export default function App() {
  const [orders, setOrders] = useState<WebOrder[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [filters, setFilters] = useState<Filters>({ query: '', source: 'all', minBudget: 0 })

  const refresh = useCallback(async () => {
    try {
      setOrders(await loadOrders())
      setUpdatedAt(new Date())
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }, [])

  // Новые заказы появляются раз в 10 минут, поэтому раз в минуту перечитывать более чем достаточно.
  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), REFRESH_MS)
    return () => clearInterval(timer)
  }, [refresh])

  const visible = useMemo(() => filterOrders(orders, filters), [orders, filters])
  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }))

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>
            <span className="radar" aria-hidden="true" />
            Order Radar
          </h1>
          <p className="muted">
            Заказы с kwork и fl.ru
            {updatedAt && ` · обновлено в ${updatedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
        <button className="ghost" onClick={() => void refresh()} disabled={status === 'loading'}>
          Обновить
        </button>
      </header>

      <section className="toolbar" aria-label="Фильтры">
        <input
          type="search"
          placeholder="Поиск: react лендинг"
          value={filters.query}
          onChange={(e) => update({ query: e.target.value })}
          aria-label="Поиск по заказам"
        />
        <div className="segmented" role="group" aria-label="Источник">
          {SOURCES.map((s) => (
            <button
              key={s.value}
              className={filters.source === s.value ? 'active' : ''}
              aria-pressed={filters.source === s.value}
              onClick={() => update({ source: s.value })}
            >
              {s.label}
            </button>
          ))}
        </div>
        <select
          value={filters.minBudget}
          onChange={(e) => update({ minBudget: Number(e.target.value) })}
          aria-label="Минимальный бюджет"
        >
          {BUDGETS.map((n) => (
            <option key={n} value={n}>
              {n ? `от ${rub(n)}` : 'Любой бюджет'}
            </option>
          ))}
        </select>
      </section>

      {status === 'loading' && orders.length === 0 && <p className="state">Загружаю заказы…</p>}
      {status === 'error' && <p className="state error">Не получилось загрузить: {error}</p>}
      {status === 'ready' && (
        <p className="count muted">
          {visible.length === orders.length ? `${orders.length} заказов` : `${visible.length} из ${orders.length}`}
        </p>
      )}
      {status === 'ready' && visible.length === 0 && (
        <p className="state">Ничего не нашлось. Попробуй убрать часть фильтров.</p>
      )}

      <ul className="list">
        {visible.map((o) => (
          <li key={o.id} className="card">
            <div className="card-top">
              <span className={`badge ${o.source}`}>{o.source === 'fl' ? 'fl.ru' : o.source}</span>
              <span className="muted">{timeAgo(o.published_at)}</span>
              <span className={`budget ${o.budget === null ? 'muted' : ''}`}>
                {o.budget === null ? 'договорная' : rub(o.budget)}
              </span>
            </div>
            <h2>
              <a href={o.url} target="_blank" rel="noopener noreferrer">
                {o.title}
              </a>
            </h2>
            {o.description && <p className="description">{o.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
