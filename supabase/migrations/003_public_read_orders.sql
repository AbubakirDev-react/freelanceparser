-- Веб-страница (этап 7) ходит в базу с publishable-ключом, то есть под ролью anon.
-- Ей нужно только читать заказы. Два замка: права на таблицы (GRANT) и RLS-политика.

-- 1. Права. По умолчанию Supabase выдаёт anon всё, и защищает только RLS.
--    Оставляем лишь то, что нужно: на случай, если когда-нибудь появится слишком широкая политика.
revoke all on public.orders   from anon, authenticated;
revoke all on public.settings from anon, authenticated;
grant select on public.orders to anon, authenticated;

-- 2. RLS: читать заказы может кто угодно. Это и так публичные данные с kwork и fl.ru.
--    Настройки (ключевые слова, бюджет) остаются закрытыми: политик на settings нет.
create policy "Заказы доступны для чтения всем"
  on public.orders for select
  to anon, authenticated
  using (true);
