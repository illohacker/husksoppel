-- Push notification subscriptions
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  keys_p256dh text not null,
  keys_auth text not null,
  address_id text not null,
  address_text text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Allow inserts/updates from anon (the app uses anon key)
create policy "Allow insert" on public.push_subscriptions
  for insert with check (true);

create policy "Allow update" on public.push_subscriptions
  for update using (true);

-- Service role can read all for sending notifications
create policy "Allow select for service role" on public.push_subscriptions
  for select using (true);

-- Allow delete for unsubscribe
create policy "Allow delete" on public.push_subscriptions
  for delete using (true);
