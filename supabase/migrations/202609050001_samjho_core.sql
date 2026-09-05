create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id text primary key,
  display_name text,
  avatar_url text,
  preferred_language text not null default 'hinglish' check (preferred_language in ('english', 'hindi', 'hinglish')),
  role text not null default 'learner' check (role in ('learner', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null default 'New learning session',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_user_id_idx on public.conversations(user_id);
create index if not exists conversations_updated_at_idx on public.conversations(updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists messages_created_at_idx on public.messages(created_at);

create table if not exists public.learner_states (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations(id) on delete cascade,
  user_id text not null,
  knowledge_level integer not null default 0 check (knowledge_level between 0 and 5),
  understanding_level integer not null default 0 check (understanding_level between 0 and 5),
  difficulty text not null default 'basic',
  preferred_style text not null default 'real_life_analogy',
  language text not null default 'hinglish',
  learning_goal text not null default 'understand_concept',
  misconceptions jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.message_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id text not null,
  rating text not null check (rating in ('helpful', 'not_helpful')),
  created_at timestamptz not null default now(),
  unique(message_id, user_id)
);

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  brand_name text not null default 'Samjho',
  logo_url text,
  tagline text not null default 'AI that teaches, not just answers.',
  default_language text not null default 'hinglish',
  default_learning_goal text not null default 'understand_concept',
  tutor_instructions text not null default 'Teach for understanding. Adapt your explanation when the learner struggles.',
  enabled_strategies jsonb not null default '["simple_definition", "real_life_analogy", "step_by_step", "mental_visualization", "socratic"]'::jsonb,
  max_input_length integer not null default 10000,
  max_context_messages integer not null default 20,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.learner_states enable row level security;
alter table public.message_feedback enable row level security;
alter table public.app_settings enable row level security;

-- The public client has no database access. Every query goes through Next.js,
-- which verifies the Firebase ID token before using the server role key.
create policy "deny direct profile access" on public.profiles for all using (false) with check (false);
create policy "deny direct conversation access" on public.conversations for all using (false) with check (false);
create policy "deny direct message access" on public.messages for all using (false) with check (false);
create policy "deny direct learner state access" on public.learner_states for all using (false) with check (false);
create policy "deny direct feedback access" on public.message_feedback for all using (false) with check (false);
create policy "deny direct settings access" on public.app_settings for all using (false) with check (false);
