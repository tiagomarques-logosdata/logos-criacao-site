create table if not exists public.logos_leads (
  id uuid primary key,
  name text not null check (char_length(name) between 2 and 120),
  whatsapp text not null check (whatsapp ~ '^55[1-9][0-9]9[0-9]{8}$'),
  created_at timestamptz not null default now(),
  contacted_at timestamptz,
  source text not null default 'desenvolvimento-de-sites',
  rate_hash text not null,
  consent_version text not null default 'contact-v1'
);
create index if not exists logos_leads_created_idx on public.logos_leads(created_at desc);
create index if not exists logos_leads_rate_idx on public.logos_leads(rate_hash, created_at desc);
create index if not exists logos_leads_phone_idx on public.logos_leads(whatsapp, created_at desc);
alter table public.logos_leads enable row level security;
revoke all on public.logos_leads from anon, authenticated;
grant select, insert, update on public.logos_leads to service_role;

create or replace function public.logos_create_lead(p_id uuid, p_name text, p_whatsapp text, p_rate_hash text)
returns table(id uuid, created boolean)
language plpgsql security definer set search_path = public as $$
declare existing public.logos_leads;
begin
  perform pg_advisory_xact_lock(hashtextextended('lead-id:' || p_id::text,0));
  select * into existing from public.logos_leads l where l.id = p_id;
  if found then
    if existing.name <> p_name or existing.whatsapp <> p_whatsapp then
      raise exception 'idempotency_conflict';
    end if;
    return query select existing.id, false; return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('lead-rate:' || p_rate_hash,0));
  perform pg_advisory_xact_lock(hashtextextended('lead-phone:' || p_whatsapp,0));
  if (select count(*) from public.logos_leads l where l.rate_hash = p_rate_hash and l.created_at > now()-interval '1 hour') >= 8
    or (select count(*) from public.logos_leads l where l.whatsapp = p_whatsapp and l.created_at > now()-interval '24 hours') >= 3 then
    return; end if;
  insert into public.logos_leads(id,name,whatsapp,rate_hash) values(p_id,p_name,p_whatsapp,p_rate_hash);
  return query select p_id,true;
end $$;
revoke all on function public.logos_create_lead(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.logos_create_lead(uuid,text,text,text) to service_role;
