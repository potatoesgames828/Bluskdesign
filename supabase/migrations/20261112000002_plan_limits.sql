-- Limites de registros por plano aplicados no banco (não dependem do frontend).
create or replace function public.current_plan_limits(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select p.limits
  from public.plans p
  left join public.subscriptions s on s.user_id = p_user and s.status in ('active','trialing')
  where p.id = coalesce(s.plan_id, 'free');
$$;

create or replace function public.enforce_plan_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_limit integer; v_count integer;
begin
  if coalesce(auth.role(), '') = 'service_role' then return new; end if;
  v_limit := nullif(public.current_plan_limits(new.user_id) ->> tg_argv[0], '')::integer;
  if v_limit is null then return new; end if;
  execute format('select count(*) from public.%I where user_id = $1', tg_table_name) into v_count using new.user_id;
  if v_count >= v_limit then
    raise exception 'Limite do seu plano atingido (% de %). Faça upgrade para continuar.', v_count, v_limit
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger clients_limit before insert on public.clients for each row execute function public.enforce_plan_limit('clients');
create trigger leads_limit before insert on public.leads for each row execute function public.enforce_plan_limit('leads');
create trigger opportunities_limit before insert on public.opportunities for each row execute function public.enforce_plan_limit('opportunities');
create trigger projects_limit before insert on public.projects for each row execute function public.enforce_plan_limit('projects');
create trigger portfolio_limit before insert on public.portfolio_items for each row execute function public.enforce_plan_limit('portfolio_items');

-- Visão administrativa agregada (somente admins conseguem ler via função)
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'users_30d', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'by_plan', (select coalesce(jsonb_object_agg(plan_id, n), '{}'::jsonb) from (select plan_id, count(*) n from public.subscriptions where status in ('active','trialing') group by plan_id) x),
    'revenue_cents_30d', (select coalesce(sum(amount_cents),0) from public.payments where status = 'paid' and paid_at > now() - interval '30 days'),
    'clients', (select count(*) from public.clients),
    'leads', (select count(*) from public.leads),
    'opportunities', (select count(*) from public.opportunities),
    'projects', (select count(*) from public.projects),
    'usage', (select coalesce(jsonb_object_agg(feature, total), '{}'::jsonb) from (select feature, sum(count) total from public.usage_counters where period = to_char(now(),'YYYY-MM') group by feature) u)
  );
end $$;

-- Para promover o primeiro administrador (executar manualmente no SQL Editor):
--   update public.profiles set role = 'admin' where email = 'seu-email@dominio.com';
