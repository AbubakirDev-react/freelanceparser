-- Пауза уведомлений: кнопка ⏸ в боте. Пока true, cron собирает заказы в базу, но в Telegram их не шлёт.
alter table public.settings add column paused boolean not null default false;
