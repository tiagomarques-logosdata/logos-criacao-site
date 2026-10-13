alter table public.logos_leads add column if not exists email_notice_pending boolean not null default false;
alter table public.logos_leads add column if not exists email_notice_sent_at timestamptz;
alter table public.logos_leads add column if not exists email_notice_claimed_at timestamptz;
create index if not exists logos_leads_email_pending_idx on public.logos_leads(created_at) where email_notice_pending=true;
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
  insert into public.logos_leads(id,name,whatsapp,rate_hash,email_notice_pending) values(p_id,p_name,p_whatsapp,p_rate_hash,true);
  return query select p_id,true;
end $$;
revoke all on function public.logos_create_lead(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.logos_create_lead(uuid,text,text,text) to service_role;

create or replace function public.logos_claim_lead_email(p_id uuid)
returns setof public.logos_leads
language sql security definer set search_path=public as $$
 update public.logos_leads set email_notice_claimed_at=now()
 where id=p_id and email_notice_pending=true and email_notice_sent_at is null
 and (email_notice_claimed_at is null or email_notice_claimed_at < now()-interval '10 minutes')
 returning *;
$$;
revoke all on function public.logos_claim_lead_email(uuid) from public,anon,authenticated;
grant execute on function public.logos_claim_lead_email(uuid) to service_role;
