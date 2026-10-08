create table if not exists public.logos_orders (
  id uuid primary key,
  name text not null,
  email text not null,
  amount integer not null check (amount = 100000),
  status text not null default 'created' check (status in ('created','paid','queued','processing','needs_review','completed','failed')),
  checkout_url text,
  token_hash text not null unique,
  token_expires_at timestamptz,
  paid_at timestamptz,
  transaction_nsu text unique,
  invoice_slug text,
  email_sent_at timestamptz,
  email_claimed_at timestamptz,
  briefing jsonb,
  submitted_at timestamptz,
  analysis jsonb,
  lease uuid,
  worker text,
  started_at timestamptz,
  finished_at timestamptz,
  result_note text,
  created_at timestamptz not null default now()
);
alter table public.logos_orders enable row level security;
revoke all on public.logos_orders from anon, authenticated;
grant all on public.logos_orders to service_role;

create or replace function public.logos_claim_email(p_id uuid)
returns setof public.logos_orders language sql security invoker set search_path = public as $$
  update public.logos_orders set email_claimed_at = now()
  where id = p_id and paid_at is not null and email_sent_at is null
    and (email_claimed_at is null or email_claimed_at < now() - interval '5 minutes')
  returning *;
$$;
create or replace function public.logos_claim_job(p_worker text)
returns setof public.logos_orders language sql security invoker set search_path = public as $$
  update public.logos_orders set status = 'processing', lease = gen_random_uuid(), worker = p_worker, started_at = now()
  where id = (select id from public.logos_orders where status = 'queued' and paid_at is not null
    order by submitted_at for update skip locked limit 1)
  returning *;
$$;
revoke all on function public.logos_claim_email(uuid) from public, anon, authenticated;
revoke all on function public.logos_claim_job(text) from public, anon, authenticated;
grant execute on function public.logos_claim_email(uuid) to service_role;
grant execute on function public.logos_claim_job(text) to service_role;
-- Limites atômicos para evitar criação ilimitada de pedidos/links.
create or replace function public.logos_create_order(p_id uuid, p_name text, p_email text, p_token_hash text)
returns setof public.logos_orders language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(18430684930);
  if (select count(*) from public.logos_orders where created_at > now() - interval '1 hour') >= 100
     or (select count(*) from public.logos_orders where email = p_email and created_at > now() - interval '1 hour') >= 3 then
    return;
  end if;
  return query insert into public.logos_orders(id, name, email, amount, token_hash, status)
    values (p_id, p_name, p_email, 100000, p_token_hash, 'created') returning *;
end;
$$;
revoke all on function public.logos_create_order(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.logos_create_order(uuid, text, text, text) to service_role;
