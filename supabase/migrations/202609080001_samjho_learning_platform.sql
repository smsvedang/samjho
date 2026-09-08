-- Samjho Learning Platform Migration (Additive)
-- Migration: 202609080001_samjho_learning_platform.sql

-- 1. Extend profiles with learning context if columns don't exist
alter table public.profiles add column if not exists education_level text default 'college';
alter table public.profiles add column if not exists exam_target text default 'general';
alter table public.profiles add column if not exists onboarded boolean default false;

-- 2. Subjects table
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text not null default '📚',
  description text not null default '',
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists subjects_order_idx on public.subjects(order_index);

-- 3. Topics table
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  parent_topic_id uuid references public.topics(id) on delete set null,
  key_concepts jsonb not null default '[]'::jsonb,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  unique(subject_id, slug)
);
create index if not exists topics_subject_id_idx on public.topics(subject_id);
create index if not exists topics_order_idx on public.topics(order_index);

-- 4. Student Topic Mastery table
create table if not exists public.student_topics (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  topic_id uuid not null references public.topics(id) on delete cascade,
  mastery_score numeric(5,2) not null default 0.00 check (mastery_score between 0 and 100),
  status text not null default 'not_learned' check (status in ('not_learned', 'weak', 'developing', 'good', 'strong', 'mastered')),
  confidence numeric(3,2) not null default 0.00 check (confidence between 0 and 1),
  accuracy numeric(5,2) not null default 0.00 check (accuracy between 0 and 100),
  total_attempts integer not null default 0,
  correct_attempts integer not null default 0,
  weak_concepts jsonb not null default '[]'::jsonb,
  last_studied_at timestamptz,
  next_revision_at timestamptz,
  revision_interval_days integer not null default 1,
  revision_stage integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, topic_id)
);
create index if not exists student_topics_user_idx on public.student_topics(user_id);
create index if not exists student_topics_user_topic_idx on public.student_topics(user_id, topic_id);
create index if not exists student_topics_next_revision_idx on public.student_topics(user_id, next_revision_at);

-- 5. Questions repository table
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  concept_tested text not null,
  question_type text not null check (question_type in ('mcq', 'numerical', 'true_false', 'fill_blank', 'short_answer', 'conceptual')),
  difficulty integer not null default 1 check (difficulty between 1 and 6),
  question text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  explanation text not null default '',
  solution_steps jsonb not null default '[]'::jsonb,
  hints jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists questions_topic_difficulty_idx on public.questions(topic_id, difficulty);
create index if not exists questions_concept_idx on public.questions(concept_tested);

-- 6. Attempts table
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  question_id uuid references public.questions(id) on delete set null,
  topic_id uuid not null references public.topics(id) on delete cascade,
  user_answer text not null,
  is_correct boolean not null,
  time_taken_seconds integer not null default 0,
  mistake_type text check (mistake_type in ('conceptual', 'calculation', 'application', 'memory', 'sign_unit', 'careless', 'unknown')),
  confidence numeric(3,2) default 1.0,
  notes text default '',
  created_at timestamptz not null default now()
);
create index if not exists attempts_user_topic_idx on public.attempts(user_id, topic_id);
create index if not exists attempts_user_created_idx on public.attempts(user_id, created_at desc);

-- 7. Mistake Book table
create table if not exists public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  question_id uuid references public.questions(id) on delete set null,
  topic_id uuid not null references public.topics(id) on delete cascade,
  concept text not null,
  mistake_type text not null check (mistake_type in ('conceptual', 'calculation', 'application', 'memory', 'sign_unit', 'careless', 'unknown')),
  student_answer text not null default '',
  correct_answer text not null default '',
  explanation text not null default '',
  occurrence_count integer not null default 1,
  resolution_streak integer not null default 0,
  resolved boolean not null default false,
  first_occurred_at timestamptz not null default now(),
  last_occurred_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, topic_id, concept, mistake_type)
);
create index if not exists mistakes_user_idx on public.mistakes(user_id);
create index if not exists mistakes_user_topic_idx on public.mistakes(user_id, topic_id);
create index if not exists mistakes_user_resolved_idx on public.mistakes(user_id, resolved);

-- 8. Revision items table
create table if not exists public.revision_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  topic_id uuid not null references public.topics(id) on delete cascade,
  due_at timestamptz not null,
  interval_days integer not null default 1,
  stage integer not null default 0,
  performance_history jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'completed', 'overdue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, topic_id)
);
create index if not exists revision_items_user_due_idx on public.revision_items(user_id, due_at);

-- 9. Tests table
create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  topic_id uuid not null references public.topics(id) on delete cascade,
  title text not null default 'Topic Assessment',
  total_questions integer not null default 5,
  score numeric(5,2) not null default 0.00,
  accuracy numeric(5,2) not null default 0.00,
  time_taken_seconds integer not null default 0,
  difficulty text not null default 'adaptive',
  breakdown jsonb not null default '{}'::jsonb,
  strong_areas jsonb not null default '[]'::jsonb,
  weak_areas jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists tests_user_topic_idx on public.tests(user_id, topic_id);
create index if not exists tests_user_completed_idx on public.tests(user_id, completed_at desc);

-- 10. Test Questions table
create table if not exists public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  user_answer text not null default '',
  correct_answer text not null default '',
  is_correct boolean not null default false,
  time_taken_seconds integer not null default 0,
  mistake_type text,
  explanation text not null default ''
);
create index if not exists test_questions_test_idx on public.test_questions(test_id);

-- 11. Learning Sessions table
create table if not exists public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  topic_id uuid references public.topics(id) on delete set null,
  session_type text not null check (session_type in ('chat', 'diagnostic', 'practice', 'revision', 'test', 'remediation')),
  duration_seconds integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists learning_sessions_user_idx on public.learning_sessions(user_id, started_at desc);

-- 12. Row Level Security Policies
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.student_topics enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.mistakes enable row level security;
alter table public.revision_items enable row level security;
alter table public.tests enable row level security;
alter table public.test_questions enable row level security;
alter table public.learning_sessions enable row level security;

-- Deny direct client mutations; all access is mediated through Next.js server verification
create policy "deny direct subjects write" on public.subjects for all using (false) with check (false);
create policy "deny direct topics write" on public.topics for all using (false) with check (false);
create policy "deny direct student_topics access" on public.student_topics for all using (false) with check (false);
create policy "deny direct questions write" on public.questions for all using (false) with check (false);
create policy "deny direct attempts access" on public.attempts for all using (false) with check (false);
create policy "deny direct mistakes access" on public.mistakes for all using (false) with check (false);
create policy "deny direct revision_items access" on public.revision_items for all using (false) with check (false);
create policy "deny direct tests access" on public.tests for all using (false) with check (false);
create policy "deny direct test_questions access" on public.test_questions for all using (false) with check (false);
create policy "deny direct learning_sessions access" on public.learning_sessions for all using (false) with check (false);

-- 13. Seed Starter Subjects & Topics
insert into public.subjects (name, slug, icon, description, order_index)
values
  ('Electrical Engineering', 'electrical-engineering', '⚡', 'Circuits, laws, electronic devices, and power systems.', 1),
  ('Mathematics', 'mathematics', '📐', 'Calculus, linear algebra, trigonometry, and probability.', 2),
  ('Physics', 'physics', '🔭', 'Mechanics, electromagnetism, optics, and thermodynamics.', 3),
  ('Computer Science', 'computer-science', '💻', 'Data structures, algorithms, pointers, OOP, and system design.', 4),
  ('Chemistry', 'chemistry', '🧪', 'Organic reactions, physical chemistry, and chemical bonding.', 5)
on conflict (slug) do nothing;

-- Seed Topics for Electrical Engineering
insert into public.topics (subject_id, name, slug, description, key_concepts, order_index)
select id, 'Kirchhoff''s Voltage Law (KVL)', 'kvl', 'Loop voltage analysis, mesh current, and sign conventions in circuits.', '["loop_identification", "sign_convention", "mesh_equations", "voltage_drops", "multi_loop_circuits"]'::jsonb, 1
from public.subjects where slug = 'electrical-engineering'
on conflict (subject_id, slug) do nothing;

insert into public.topics (subject_id, name, slug, description, key_concepts, order_index)
select id, 'Kirchhoff''s Current Law (KCL)', 'kcl', 'Nodal analysis and current conservation at circuit junctions.', '["node_identification", "current_directions", "nodal_equations", "supernodes"]'::jsonb, 2
from public.subjects where slug = 'electrical-engineering'
on conflict (subject_id, slug) do nothing;

insert into public.topics (subject_id, name, slug, description, key_concepts, order_index)
select id, 'Thevenin''s & Norton''s Theorems', 'thevenin-norton', 'Circuit simplification using equivalent voltage and current sources.', '["thevenin_voltage", "thevenin_resistance", "norton_current", "maximum_power_transfer"]'::jsonb, 3
from public.subjects where slug = 'electrical-engineering'
on conflict (subject_id, slug) do nothing;

-- Seed Topics for Mathematics
insert into public.topics (subject_id, name, slug, description, key_concepts, order_index)
select id, 'Definite & Indefinite Integration', 'integration', 'Integration techniques, substitution, by parts, and definite integral properties.', '["integration_constant", "substitution_method", "by_parts", "trigonometric_integrals", "area_under_curve"]'::jsonb, 1
from public.subjects where slug = 'mathematics'
on conflict (subject_id, slug) do nothing;

insert into public.topics (subject_id, name, slug, description, key_concepts, order_index)
select id, 'Differential Equations', 'differential-equations', 'First order linear differential equations, separable variables, and integrating factors.', '["separable_variables", "integrating_factor", "order_and_degree", "homogeneous_equations"]'::jsonb, 2
from public.subjects where slug = 'mathematics'
on conflict (subject_id, slug) do nothing;

-- Seed Topics for Computer Science
insert into public.topics (subject_id, name, slug, description, key_concepts, order_index)
select id, 'Pointers & Memory Management', 'pointers', 'Pointer arithmetic, dynamic allocation, references, and memory leaks.', '["pointer_syntax", "dereferencing", "pointer_arithmetic", "dynamic_allocation", "memory_leaks"]'::jsonb, 1
from public.subjects where slug = 'computer-science'
on conflict (subject_id, slug) do nothing;

insert into public.topics (subject_id, name, slug, description, key_concepts, order_index)
select id, 'Recursion & Dynamic Programming', 'recursion-dp', 'Base cases, recursive call stacks, memoization, and optimal substructure.', '["base_case_identification", "call_stack_tracing", "overlapping_subproblems", "memoization_table"]'::jsonb, 2
from public.subjects where slug = 'computer-science'
on conflict (subject_id, slug) do nothing;

-- Seed Sample High-Quality Questions for KVL (Level 1 to Level 3)
with kvl_topic as (
  select t.id as topic_id, t.subject_id from public.topics t join public.subjects s on s.id = t.subject_id where t.slug = 'kvl' limit 1
)
insert into public.questions (subject_id, topic_id, concept_tested, question_type, difficulty, question, options, correct_answer, explanation, solution_steps, hints)
select
  kt.subject_id,
  kt.topic_id,
  'loop_identification',
  'mcq',
  1,
  'Kirchhoff''s Voltage Law (KVL) is fundamentally based on the conservation of which physical quantity?',
  '["Charge", "Energy", "Momentum", "Current"]'::jsonb,
  'Energy',
  'KVL states that the algebraic sum of all voltages around any closed loop in a circuit must equal zero. Because electric potential difference is work done per unit charge, moving around a closed loop returns to the same potential, which represents conservation of energy.',
  '["Recall that electric potential $V = \\frac{W}{q}$ (work per unit charge).", "In a closed loop, the net work done moving a charge around and returning to the start is zero.", "Therefore, $\\sum V = 0$ represents conservation of Energy."]'::jsonb,
  '["Think about what voltage actually measures: work done per unit charge."]'::jsonb
from kvl_topic kt
on conflict do nothing;

with kvl_topic as (
  select t.id as topic_id, t.subject_id from public.topics t join public.subjects s on s.id = t.subject_id where t.slug = 'kvl' limit 1
)
insert into public.questions (subject_id, topic_id, concept_tested, question_type, difficulty, question, options, correct_answer, explanation, solution_steps, hints)
select
  kt.subject_id,
  kt.topic_id,
  'sign_convention',
  'numerical',
  2,
  'A single closed loop has a $24\\text{ V}$ battery, an $8\\,\\Omega$ resistor, and a $4\\,\\Omega$ resistor in series. What is the current flowing in the circuit in Amperes?',
  '[]'::jsonb,
  '2',
  'Applying KVL around the loop: $24 - I(8) - I(4) = 0 \\implies 24 = 12I \\implies I = 2\\text{ A}$.',
  '["Write KVL: $\\sum V_{\\text{sources}} - \\sum I R = 0$", "$24 - I(8 + 4) = 0$", "$24 = 12I$", "$I = 2\\text{ A}$"]'::jsonb,
  '["Add up the total series resistance first, then apply $V = I R$ or KVL."]'::jsonb
from kvl_topic kt
on conflict do nothing;
