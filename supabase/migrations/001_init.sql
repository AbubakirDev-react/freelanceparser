-- Заказы со всех источников.
-- UNIQUE(source, external_id) — дедупликация на уровне БД: повторный insert того же заказа просто игнорируется.
create table public.orders (
  id           bigint generated always as identity primary key,
  source       text        not null,
  external_id  text        not null,
  title        text        not null,
  description  text        not null default '',
  budget       numeric,
  url          text        not null,
  published_at timestamptz not null,
  created_at   timestamptz not null default now(),
  notified_at  timestamptz, -- null = ещё не отправлен в Telegram
  unique (source, external_id)
);

-- Настройки фильтра: ровно одна строка (id = 1), ведь пользователь один.
create table public.settings (
  id         int     primary key default 1 check (id = 1),
  keywords   text[]  not null default '{}',
  min_budget numeric not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);

-- RLS включён без политик: anon-ключ не видит ничего, скрипт ходит через service_role.
-- Политику «anon читает orders» добавим на этапе 7 для веб-страницы.
alter table public.orders   enable row level security;
alter table public.settings enable row level security;
