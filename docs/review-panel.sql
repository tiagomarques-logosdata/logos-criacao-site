alter table public.logos_orders add column if not exists revision integer not null default 0;
alter table public.logos_orders add column if not exists review_email_sent_at timestamptz;
alter table public.logos_orders add column if not exists review_email_claimed_at timestamptz;
create table if not exists public.logos_admin_tokens (token_hash text primary key, created_at timestamptz not null default now(), expires_at timestamptz not null, used_at timestamptz);
create table if not exists public.logos_admin_sessions (token_hash text primary key, expires_at timestamptz not null);
create table if not exists public.logos_review_history (id bigint generated always as identity primary key, order_id uuid not null references public.logos_orders(id), created_at timestamptz not null default now(), actor text not null, note text not null, before_briefing jsonb not null, after_briefing jsonb not null, requeued boolean not null);
alter table public.logos_admin_tokens enable row level security;
alter table public.logos_admin_sessions enable row level security;
alter table public.logos_review_history enable row level security;
revoke all on public.logos_admin_tokens, public.logos_admin_sessions, public.logos_review_history from anon, authenticated;
grant all on public.logos_admin_tokens, public.logos_admin_sessions, public.logos_review_history to service_role;
grant usage, select on sequence public.logos_review_history_id_seq to service_role;

create or replace function public.logos_admin_token(p_hash text) returns boolean language plpgsql security invoker set search_path=public as $$
begin
 perform pg_advisory_xact_lock(18430684931);
 if (select count(*) from logos_admin_tokens where created_at > now()-interval '10 minutes') >= 3 then return false; end if;
 delete from logos_admin_tokens where expires_at < now()-interval '1 day';
 delete from logos_admin_sessions where expires_at < now();
 insert into logos_admin_tokens(token_hash,expires_at) values(p_hash,now()+interval '15 minutes');
 return true;
end; $$;
create or replace function public.logos_admin_redeem(p_hash text,p_session text) returns boolean language plpgsql security invoker set search_path=public as $$
begin
 update logos_admin_tokens set used_at=now() where token_hash=p_hash and used_at is null and expires_at>now();
 if not found then return false; end if;
 insert into logos_admin_sessions(token_hash,expires_at) values(p_session,now()+interval '7 days');
 return true;
end; $$;
create or replace function public.logos_claim_review_email(p_id uuid) returns setof public.logos_orders language sql security invoker set search_path=public as $$
 update logos_orders set review_email_claimed_at=now() where id=p_id and status='needs_review' and review_email_sent_at is null and (review_email_claimed_at is null or review_email_claimed_at<now()-interval '5 minutes') returning *;
$$;
create or replace function public.logos_review_save(p_id uuid,p_revision integer,p_briefing jsonb,p_note text,p_actor text,p_requeue boolean) returns setof public.logos_orders language plpgsql security invoker set search_path=public as $$
declare current_order public.logos_orders;
begin
 select * into current_order from logos_orders where id=p_id for update;
 if not found or current_order.revision<>p_revision or current_order.status not in ('needs_review','failed') then return; end if;
 insert into logos_review_history(order_id,actor,note,before_briefing,after_briefing,requeued) values(p_id,p_actor,p_note,current_order.briefing,p_briefing,p_requeue);
 return query update logos_orders set briefing=p_briefing, revision=revision+1,
 status=case when p_requeue then 'queued' else status end,
 analysis=case when p_requeue then null else analysis end,
 lease=case when p_requeue then null else lease end,
 started_at=case when p_requeue then null else started_at end,
 finished_at=case when p_requeue then null else finished_at end,
 review_email_sent_at=case when p_requeue then null else review_email_sent_at end,
 review_email_claimed_at=case when p_requeue then null else review_email_claimed_at end,
 result_note=case when p_requeue then 'Revisado pelo time e reenviado para análise.' else 'Alterações de revisão salvas.' end
 where id=p_id returning *;
end; $$;
revoke all on function public.logos_admin_token(text),public.logos_admin_redeem(text,text),public.logos_claim_review_email(uuid),public.logos_review_save(uuid,integer,jsonb,text,text,boolean) from public,anon,authenticated;
grant execute on function public.logos_admin_token(text),public.logos_admin_redeem(text,text),public.logos_claim_review_email(uuid),public.logos_review_save(uuid,integer,jsonb,text,text,boolean) to service_role;
