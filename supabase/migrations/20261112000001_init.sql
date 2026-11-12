-- ════════════════════════════════════════════════════════════════════
-- Blusk Design — schema inicial
-- Todas as entidades privadas pertencem a um usuário (user_id) e são
-- protegidas por Row Level Security. Pagamentos/assinaturas só podem ser
-- alterados pelo backend (service role) via webhooks.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─────────────────────────── Utilitários ───────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─────────────────────────── Planos ───────────────────────────
create table public.plans (
  id text primary key check (id in ('free','pro','elite')),
  name text not null,
  description text not null default '',
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'BRL',
  features jsonb not null default '{}'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.plans (id, name, description, price_cents, features, limits, sort_order) values
('free','Free','Para começar a organizar sua operação.',0,
  '{"ai":false,"prompts":false,"hunter":false,"advanced_reports":false,"advanced_projects":false}',
  '{"clients":50,"leads":50,"opportunities":50,"projects":5,"portfolio_items":10,"ai_messages_month":0,"prompt_generations_month":0,"hunter_searches_month":0}',1),
('pro','Pro','Inteligência artificial e relatórios completos.',4990,
  '{"ai":true,"prompts":true,"hunter":false,"advanced_reports":true,"advanced_projects":true}',
  '{"clients":1000,"leads":1000,"opportunities":1000,"projects":100,"portfolio_items":200,"ai_messages_month":300,"prompt_generations_month":200,"hunter_searches_month":0}',2),
('elite','Elite','Prospecção inteligente e limites ampliados.',9990,
  '{"ai":true,"prompts":true,"hunter":true,"advanced_reports":true,"advanced_projects":true}',
  '{"clients":100000,"leads":100000,"opportunities":100000,"projects":1000,"portfolio_items":2000,"ai_messages_month":2000,"prompt_generations_month":1000,"hunter_searches_month":500}',3);

-- ─────────────────────────── Perfis ───────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  avatar_url text,
  phone text,
  company text,
  role text not null default 'user' check (role in ('user','admin')),
  preferences jsonb not null default '{"theme":"dark","locale":"pt-BR","currency":"BRL","notifications":{"email":true,"in_app":true}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- impede que um usuário comum altere o próprio papel
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and coalesce(auth.role(),'') <> 'service_role' and not public.is_admin() then
    raise exception 'Alteração de papel não permitida';
  end if;
  if new.email is distinct from old.email and coalesce(auth.role(),'') <> 'service_role' then
    new.email = old.email; -- e-mail é sincronizado a partir do auth.users
  end if;
  return new;
end $$;
create trigger profiles_protect_role before update on public.profiles for each row execute function public.protect_profile_role();

-- ─────────────────────────── Assinaturas ───────────────────────────
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id text not null default 'free' references public.plans(id),
  status text not null default 'active' check (status in ('active','trialing','past_due','canceled','incomplete')),
  provider text check (provider in ('stripe','mercadopago','manual')),
  provider_customer_id text,
  provider_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_updated before update on public.subscriptions for each row execute function public.set_updated_at();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text references public.plans(id),
  amount_cents integer not null,
  currency text not null default 'BRL',
  status text not null check (status in ('paid','pending','failed','refunded')),
  provider text not null,
  provider_payment_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index payments_user_idx on public.payments(user_id, created_at desc);

-- ─────────────────────────── Novo usuário ───────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email);
  insert into public.subscriptions (user_id, plan_id, status, provider) values (new.id, 'free', 'active', 'manual');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;
create trigger on_auth_user_email after update of email on auth.users for each row execute function public.handle_user_email_change();

-- ─────────────────────────── Uso por plano ───────────────────────────
create table public.usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  period text not null, -- AAAA-MM
  count integer not null default 0,
  primary key (user_id, feature, period)
);

-- ─────────────────────────── Clientes ───────────────────────────
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  company text,
  email text,
  phone text,
  whatsapp text,
  address text,
  category text,
  status text not null default 'active' check (status in ('active','inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_user_idx on public.clients(user_id, created_at desc);
create trigger clients_updated before update on public.clients for each row execute function public.set_updated_at();

-- ─────────────────────────── Leads ───────────────────────────
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 200),
  contact_name text,
  email text,
  phone text,
  whatsapp text,
  website text,
  instagram text,
  address text,
  neighborhood text,
  city text,
  state text,
  country text,
  segment text,
  source text not null default 'manual',
  external_id text,
  lat double precision,
  lng double precision,
  rating numeric(2,1),
  rating_count integer,
  score integer check (score between 0 and 100),
  score_breakdown jsonb,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'new' check (status in ('new','contacted','qualified','converted','discarded')),
  notes text,
  last_contact_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_id)
);
create index leads_user_idx on public.leads(user_id, created_at desc);
create trigger leads_updated before update on public.leads for each row execute function public.set_updated_at();

-- ─────────────────────────── Oportunidades (CRM) ───────────────────────────
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  company text,
  contact_name text,
  value numeric(14,2) not null default 0 check (value >= 0),
  segment text,
  owner text,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  stage text not null default 'new' check (stage in ('new','first_contact','waiting','negotiation','proposal','won','lost')),
  position integer not null default 0,
  client_id uuid references public.clients(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  notes text,
  reminder_at timestamptz,
  closed_at timestamptz,
  last_interaction_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index opportunities_user_idx on public.opportunities(user_id, stage, position);
create trigger opportunities_updated before update on public.opportunities for each row execute function public.set_updated_at();

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  type text not null check (type in ('created','status_change','value_change','contact','note','reminder','owner_change')),
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index interactions_opp_idx on public.interactions(opportunity_id, created_at desc);
create index interactions_client_idx on public.interactions(client_id, created_at desc);

-- ─────────────────────────── Projetos ───────────────────────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  description text,
  client_id uuid references public.clients(id) on delete set null,
  category text,
  contract_value numeric(14,2) not null default 0 check (contract_value >= 0),
  estimated_cost numeric(14,2) not null default 0 check (estimated_cost >= 0),
  start_date date,
  due_date date,
  owner text,
  status text not null default 'planning' check (status in ('planning','waiting','in_progress','review','approval','done','canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_user_idx on public.projects(user_id, status);
create trigger projects_updated before update on public.projects for each row execute function public.set_updated_at();

create table public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  assignee text,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_user_idx on public.project_tasks(user_id, done, due_date);
create index tasks_project_idx on public.project_tasks(project_id);
create trigger tasks_updated before update on public.project_tasks for each row execute function public.set_updated_at();

create or replace function public.task_done_at()
returns trigger language plpgsql as $$
begin
  if new.done and (tg_op = 'INSERT' or not old.done) then new.done_at = now(); end if;
  if not new.done then new.done_at = null; end if;
  return new;
end $$;
create trigger tasks_done_at before insert or update on public.project_tasks for each row execute function public.task_done_at();

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- ─────────────────────────── Portfólio ───────────────────────────
create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  client_name text,
  client_id uuid references public.clients(id) on delete set null,
  category text,
  description text,
  cover_url text,
  gallery text[] not null default '{}',
  demo_url text,
  completed_at date,
  published boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger portfolio_updated before update on public.portfolio_items for each row execute function public.set_updated_at();

-- ─────────────────────────── Financeiro ───────────────────────────
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  description text not null check (char_length(description) between 1 and 200),
  category text,
  amount numeric(14,2) not null check (amount > 0),
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  date date not null default current_date,       -- competência / vencimento
  paid_at date,                                   -- data efetiva do recebimento/pagamento
  payment_method text,
  status text not null default 'pending' check (status in ('paid','pending','canceled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transactions_user_idx on public.transactions(user_id, type, date desc);
create trigger transactions_updated before update on public.transactions for each row execute function public.set_updated_at();

create or replace function public.transaction_paid_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'paid' and new.paid_at is null then new.paid_at = current_date; end if;
  if new.status <> 'paid' then new.paid_at = null; end if;
  return new;
end $$;
create trigger transactions_paid_at before insert or update on public.transactions for each row execute function public.transaction_paid_at();

-- ─────────────────────────── Notificações & atividades ───────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  category text not null check (category in ('sales','projects','finance','account')),
  title text not null,
  body text not null default '',
  link text,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index notifications_user_idx on public.notifications(user_id, read_at, created_at desc);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity text not null,
  entity_id uuid,
  action text not null,
  summary text not null,
  link text,
  created_at timestamptz not null default now()
);
create index activity_user_idx on public.activity_logs(user_id, created_at desc);

-- ─────────────────────────── IA ───────────────────────────
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Nova conversa',
  assistant text not null default 'general' check (assistant in ('general','sales','projects')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger conversations_updated before update on public.ai_conversations for each row execute function public.set_updated_at();

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index ai_messages_conv_idx on public.ai_messages(conversation_id, created_at);

create table public.saved_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null,
  objective text not null,
  options jsonb not null default '{}'::jsonb,
  content text not null,
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);
create index saved_prompts_user_idx on public.saved_prompts(user_id, created_at desc);

-- Biblioteca de recursos
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  type text not null default 'link' check (type in ('link','template','snippet','reference','tool')),
  url text,
  content text,
  tags text[] not null default '{}',
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger resources_updated before update on public.resources for each row execute function public.set_updated_at();

-- ════════════════════════ Triggers de negócio ════════════════════════
create or replace function public.log_activity(p_user uuid, p_entity text, p_id uuid, p_action text, p_summary text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.activity_logs (user_id, entity, entity_id, action, summary, link)
  values (p_user, p_entity, p_id, p_action, p_summary, p_link);
$$;

create or replace function public.notify(p_user uuid, p_type text, p_category text, p_title text, p_body text, p_link text, p_dedupe text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, category, title, body, link, dedupe_key)
  values (p_user, p_type, p_category, p_title, p_body, p_link, p_dedupe)
  on conflict (user_id, dedupe_key) do nothing;
$$;

create or replace function public.trg_clients_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.user_id,'client',new.id,'created','Novo cliente: '||new.name,'/app/clientes/'||new.id);
  end if;
  return new;
end $$;
create trigger clients_activity after insert on public.clients for each row execute function public.trg_clients_activity();

create or replace function public.trg_leads_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_activity(new.user_id,'lead',new.id,'created','Novo lead: '||new.company_name,'/app/contatos?lead='||new.id);
  perform public.notify(new.user_id,'new_lead','sales','Novo lead cadastrado',new.company_name,'/app/contatos?lead='||new.id);
  return new;
end $$;
create trigger leads_activity after insert on public.leads for each row execute function public.trg_leads_activity();

create or replace function public.stage_label(s text) returns text language sql immutable as $$
  select case s when 'new' then 'Novo lead' when 'first_contact' then 'Primeiro contato' when 'waiting' then 'Aguardando resposta'
    when 'negotiation' then 'Em negociação' when 'proposal' then 'Proposta enviada' when 'won' then 'Fechado' when 'lost' then 'Perdido' else s end;
$$;

create or replace function public.trg_opportunities()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.interactions (user_id, opportunity_id, client_id, type, content)
      values (new.user_id, new.id, new.client_id, 'created', 'Oportunidade criada em '||public.stage_label(new.stage));
    perform public.log_activity(new.user_id,'opportunity',new.id,'created','Nova oportunidade: '||new.title,'/app/crm/'||new.id);
    perform public.notify(new.user_id,'new_opportunity','sales','Nova oportunidade',new.title,'/app/crm/'||new.id);
  else
    if new.stage is distinct from old.stage then
      insert into public.interactions (user_id, opportunity_id, client_id, type, content, metadata)
        values (new.user_id, new.id, new.client_id, 'status_change',
          public.stage_label(old.stage)||' → '||public.stage_label(new.stage),
          jsonb_build_object('from',old.stage,'to',new.stage));
      perform public.log_activity(new.user_id,'opportunity',new.id,'stage','"'||new.title||'" movida para '||public.stage_label(new.stage),'/app/crm/'||new.id);
      perform public.notify(new.user_id,'status_change','sales','Mudança de status',new.title||': '||public.stage_label(new.stage),'/app/crm/'||new.id);
    end if;
    if new.value is distinct from old.value then
      insert into public.interactions (user_id, opportunity_id, client_id, type, content, metadata)
        values (new.user_id, new.id, new.client_id, 'value_change', 'Valor alterado',
          jsonb_build_object('from',old.value,'to',new.value));
    end if;
    if new.owner is distinct from old.owner then
      insert into public.interactions (user_id, opportunity_id, client_id, type, content)
        values (new.user_id, new.id, new.client_id, 'owner_change', 'Responsável: '||coalesce(new.owner,'—'));
    end if;
  end if;
  return new;
end $$;
create trigger opportunities_after after insert or update on public.opportunities for each row execute function public.trg_opportunities();

create or replace function public.trg_opportunities_before()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    new.last_interaction_at = now();
    if new.stage in ('won','lost') then new.closed_at = now(); else new.closed_at = null; end if;
  end if;
  if tg_op = 'INSERT' and new.stage in ('won','lost') then new.closed_at = now(); end if;
  return new;
end $$;
create trigger opportunities_before before insert or update on public.opportunities for each row execute function public.trg_opportunities_before();

create or replace function public.trg_interactions_touch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.opportunity_id is not null and new.type in ('contact','note') then
    update public.opportunities set last_interaction_at = now() where id = new.opportunity_id;
  end if;
  return new;
end $$;
create trigger interactions_touch after insert on public.interactions for each row execute function public.trg_interactions_touch();

create or replace function public.trg_projects_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.user_id,'project',new.id,'created','Novo projeto: '||new.name,'/app/projetos/'||new.id);
  elsif new.status is distinct from old.status then
    perform public.log_activity(new.user_id,'project',new.id,'status','Projeto "'||new.name||'" atualizado','/app/projetos/'||new.id);
  end if;
  return new;
end $$;
create trigger projects_activity after insert or update on public.projects for each row execute function public.trg_projects_activity();

create or replace function public.trg_tasks_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_link text := case when new.project_id is null then '/app/tarefas' else '/app/projetos/'||new.project_id end;
begin
  if tg_op = 'INSERT' then
    perform public.notify(new.user_id,'new_task','projects','Nova tarefa',new.title,v_link);
  elsif new.done and not old.done then
    perform public.log_activity(new.user_id,'task',new.id,'done','Tarefa concluída: '||new.title,v_link);
  end if;
  return new;
end $$;
create trigger tasks_activity after insert or update on public.project_tasks for each row execute function public.trg_tasks_activity();

create or replace function public.trg_transactions_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'income' and new.status = 'paid' and (tg_op = 'INSERT' or old.status <> 'paid') then
    perform public.log_activity(new.user_id,'transaction',new.id,'paid','Pagamento registrado: '||new.description,'/app/financeiro/receitas');
    perform public.notify(new.user_id,'payment_received','finance','Pagamento recebido',new.description||' — R$ '||to_char(new.amount,'FM999G999G990D00'),'/app/financeiro/receitas');
  end if;
  return new;
end $$;
create trigger transactions_activity after insert or update on public.transactions for each row execute function public.trg_transactions_activity();

-- Alertas de prazo (idempotente, chamado pelo app)
create or replace function public.refresh_deadline_alerts()
returns integer language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n integer := 0; r record;
begin
  if uid is null then return 0; end if;
  for r in select id, name, due_date from public.projects
           where user_id = uid and status not in ('done','canceled') and due_date is not null and due_date <= current_date + 3 loop
    if r.due_date < current_date then
      perform public.notify(uid,'project_late','projects','Projeto atrasado',r.name||' venceu em '||to_char(r.due_date,'DD/MM'),'/app/projetos/'||r.id,'late:'||r.id||':'||r.due_date);
    else
      perform public.notify(uid,'deadline','projects','Prazo próximo',r.name||' vence em '||to_char(r.due_date,'DD/MM'),'/app/projetos/'||r.id,'due:'||r.id||':'||r.due_date);
    end if;
    n := n + 1;
  end loop;
  for r in select id, description, date from public.transactions
           where user_id = uid and type = 'income' and status = 'pending' and date < current_date loop
    perform public.notify(uid,'payment_pending','finance','Pagamento pendente',r.description||' venceu em '||to_char(r.date,'DD/MM'),'/app/financeiro/receitas','pend:'||r.id||':'||r.date);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Contador de uso atômico (somente backend autenticado do próprio usuário)
create or replace function public.consume_usage(p_feature text, p_limit integer)
returns integer language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_period text := to_char(now(),'YYYY-MM'); v_count integer;
begin
  if uid is null then raise exception 'não autenticado'; end if;
  insert into public.usage_counters (user_id, feature, period, count) values (uid, p_feature, v_period, 0)
    on conflict do nothing;
  update public.usage_counters set count = count + 1
    where user_id = uid and feature = p_feature and period = v_period and count < p_limit
    returning count into v_count;
  if v_count is null then return -1; end if;
  return v_count;
end $$;

-- ════════════════════════ Row Level Security ════════════════════════
alter table public.plans enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.usage_counters enable row level security;
alter table public.clients enable row level security;
alter table public.leads enable row level security;
alter table public.opportunities enable row level security;
alter table public.interactions enable row level security;
alter table public.projects enable row level security;
alter table public.project_tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.saved_prompts enable row level security;
alter table public.resources enable row level security;

-- planos: leitura pública, escrita somente admin
create policy plans_read on public.plans for select using (true);
create policy plans_admin on public.plans for update using (public.is_admin()) with check (public.is_admin());

-- perfis
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_update on public.profiles for update using (public.is_admin());

-- assinaturas e pagamentos: somente leitura para o dono; escrita via service role (webhook)
create policy subscriptions_read on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());
create policy subscriptions_admin on public.subscriptions for update using (public.is_admin()) with check (public.is_admin());
create policy payments_read on public.payments for select using (user_id = auth.uid() or public.is_admin());
create policy usage_read on public.usage_counters for select using (user_id = auth.uid() or public.is_admin());

-- tabelas privadas: CRUD somente do dono
do $$
declare t text;
begin
  foreach t in array array['clients','leads','opportunities','interactions','projects','project_tasks','task_comments',
                           'portfolio_items','transactions','ai_conversations','ai_messages','saved_prompts','resources'] loop
    execute format('create policy %1$s_owner_select on public.%1$s for select using (user_id = auth.uid())', t);
    execute format('create policy %1$s_owner_insert on public.%1$s for insert with check (user_id = auth.uid())', t);
    execute format('create policy %1$s_owner_update on public.%1$s for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy %1$s_owner_delete on public.%1$s for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

create policy notifications_select on public.notifications for select using (user_id = auth.uid());
create policy notifications_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid());
create policy activity_select on public.activity_logs for select using (user_id = auth.uid());

-- Garante que referências (cliente/projeto) também pertencem ao mesmo usuário
create or replace function public.check_owned_refs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (to_jsonb(new) ? 'client_id') and (to_jsonb(new)->>'client_id') is not null then
    if not exists (select 1 from public.clients where id = (to_jsonb(new)->>'client_id')::uuid and user_id = new.user_id) then
      raise exception 'Cliente inválido';
    end if;
  end if;
  if (to_jsonb(new) ? 'project_id') and (to_jsonb(new)->>'project_id') is not null then
    if not exists (select 1 from public.projects where id = (to_jsonb(new)->>'project_id')::uuid and user_id = new.user_id) then
      raise exception 'Projeto inválido';
    end if;
  end if;
  if (to_jsonb(new) ? 'opportunity_id') and (to_jsonb(new)->>'opportunity_id') is not null then
    if not exists (select 1 from public.opportunities where id = (to_jsonb(new)->>'opportunity_id')::uuid and user_id = new.user_id) then
      raise exception 'Oportunidade inválida';
    end if;
  end if;
  if (to_jsonb(new) ? 'conversation_id') then
    if not exists (select 1 from public.ai_conversations where id = (to_jsonb(new)->>'conversation_id')::uuid and user_id = new.user_id) then
      raise exception 'Conversa inválida';
    end if;
  end if;
  if (to_jsonb(new) ? 'task_id') then
    if not exists (select 1 from public.project_tasks where id = (to_jsonb(new)->>'task_id')::uuid and user_id = new.user_id) then
      raise exception 'Tarefa inválida';
    end if;
  end if;
  return new;
end $$;
create trigger opportunities_refs before insert or update on public.opportunities for each row execute function public.check_owned_refs();
create trigger interactions_refs before insert or update on public.interactions for each row execute function public.check_owned_refs();
create trigger projects_refs before insert or update on public.projects for each row execute function public.check_owned_refs();
create trigger tasks_refs before insert or update on public.project_tasks for each row execute function public.check_owned_refs();
create trigger transactions_refs before insert or update on public.transactions for each row execute function public.check_owned_refs();
create trigger portfolio_refs before insert or update on public.portfolio_items for each row execute function public.check_owned_refs();
create trigger ai_messages_refs before insert or update on public.ai_messages for each row execute function public.check_owned_refs();
create trigger task_comments_refs before insert or update on public.task_comments for each row execute function public.check_owned_refs();

-- ════════════════════════ Storage ════════════════════════
insert into storage.buckets (id, name, public) values
  ('avatars','avatars',true), ('portfolio','portfolio',true), ('client-files','client-files',false)
on conflict (id) do nothing;

create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "portfolio public read" on storage.objects for select using (bucket_id = 'portfolio');
create policy "own files read" on storage.objects for select
  using (bucket_id = 'client-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files write" on storage.objects for insert
  with check (bucket_id in ('avatars','portfolio','client-files') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files update" on storage.objects for update
  using (bucket_id in ('avatars','portfolio','client-files') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files delete" on storage.objects for delete
  using (bucket_id in ('avatars','portfolio','client-files') and (storage.foldername(name))[1] = auth.uid()::text);
