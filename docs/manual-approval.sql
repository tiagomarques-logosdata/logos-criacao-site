-- Preserva dados financeiros antigos; novos projetos têm valor não registrado (zero), sem tabela de preços.
alter table public.logos_orders drop constraint if exists logos_orders_amount_check;
alter table public.logos_orders add constraint logos_orders_amount_check check(amount>=0);
alter table public.logos_orders add column if not exists agreed_scope text;
alter table public.logos_orders add column if not exists agreed_deadline text;
alter table public.logos_orders add column if not exists briefing_notice_at timestamptz;
alter table public.logos_orders add column if not exists briefing_notice_claimed_at timestamptz;
create or replace function public.logos_claim_briefing_notice(p_id uuid) returns setof public.logos_orders language sql security invoker set search_path=public as $$
 update logos_orders set briefing_notice_claimed_at=now() where id=p_id and briefing is not null and briefing_notice_at is null and (briefing_notice_claimed_at is null or briefing_notice_claimed_at<now()-interval '5 minutes') returning *;
$$;
revoke all on function public.logos_claim_briefing_notice(uuid) from public,anon,authenticated;
grant execute on function public.logos_claim_briefing_notice(uuid) to service_role;
create or replace function public.logos_create_manual_order(p_id uuid,p_name text,p_email text,p_hash text,p_scope text,p_deadline text,p_actor text)
returns setof public.logos_orders language plpgsql security invoker set search_path=public as $$
begin
 perform pg_advisory_xact_lock(18430684930);
 if (select count(*) from logos_orders where created_at>now()-interval '1 hour')>=100 or (select count(*) from logos_orders where email=p_email and created_at>now()-interval '1 hour')>=3 then return; end if;
 return query insert into logos_orders(id,name,email,amount,token_hash,status,paid_at,token_expires_at,agreed_scope,agreed_deadline,result_note)
 values(p_id,p_name,p_email,0,p_hash,'paid',now(),now()+interval '30 days',p_scope,p_deadline,'Contratação confirmada manualmente por '||p_actor||'. Formulário liberado após alinhamento comercial.') returning *;
end; $$;
create or replace function public.logos_approve_build(p_id uuid,p_revision integer,p_fingerprint text,p_analysis jsonb,p_approval jsonb,p_actor text)
returns setof public.logos_orders language plpgsql security invoker set search_path=public as $$
declare current_order public.logos_orders;
begin
 select * into current_order from logos_orders where id=p_id for update;
 if not found or current_order.status<>'needs_review' or current_order.revision<>p_revision or current_order.analysis<>p_analysis then return; end if;
 if p_approval->>'fingerprint'<>p_fingerprint or (p_approval->>'revision')::integer<>p_revision or p_approval->>'actor'<>p_actor then return; end if;
 insert into logos_review_history(order_id,actor,note,before_briefing,after_briefing,requeued)
 values(p_id,p_actor,'Escopo e prompt aprovados para construção. Escopo: '||(p_approval->>'scope')||'. Prazo combinado: '||(p_approval->>'deadline'),current_order.briefing,current_order.briefing,true);
 return query update logos_orders set status='queued',analysis=p_analysis||jsonb_build_object('approval',p_approval),lease=null,started_at=null,finished_at=null,result_note='Escopo e prompt aprovados. Construção liberada pelo responsável.',review_email_sent_at=null,review_email_claimed_at=null where id=p_id returning *;
end; $$;
create or replace function public.logos_claim_review_email(p_id uuid) returns setof public.logos_orders language sql security invoker set search_path=public as $$
 update logos_orders set review_email_claimed_at=now() where id=p_id and status in ('needs_review','completed') and review_email_sent_at is null and (review_email_claimed_at is null or review_email_claimed_at<now()-interval '5 minutes') returning *;
$$;
revoke all on function public.logos_create_manual_order(uuid,text,text,text,text,text,text),public.logos_approve_build(uuid,integer,text,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.logos_create_manual_order(uuid,text,text,text,text,text,text),public.logos_approve_build(uuid,integer,text,jsonb,jsonb,text) to service_role;

-- Toda alteração invalida o prompt e a aprovação anterior, inclusive após a primeira versão.
create or replace function public.logos_review_save(p_id uuid,p_revision integer,p_briefing jsonb,p_note text,p_actor text,p_requeue boolean) returns setof public.logos_orders language plpgsql security invoker set search_path=public as $$
declare current_order public.logos_orders;
begin
 select * into current_order from logos_orders where id=p_id for update;
 if not found or current_order.revision<>p_revision or current_order.status not in ('needs_review','failed','completed') then return; end if;
 insert into logos_review_history(order_id,actor,note,before_briefing,after_briefing,requeued) values(p_id,p_actor,p_note,current_order.briefing,p_briefing,p_requeue);
 return query update logos_orders set briefing=p_briefing, revision=revision+1,
 status=case when p_requeue then 'queued' else 'needs_review' end,
 analysis=null,
 lease=case when p_requeue then null else lease end,
 started_at=case when p_requeue then null else started_at end,
 finished_at=case when p_requeue then null else finished_at end,
 review_email_sent_at=case when p_requeue then null else review_email_sent_at end,
 review_email_claimed_at=case when p_requeue then null else review_email_claimed_at end,
 result_note=case when p_requeue then 'Revisado pelo time e reenviado para análise.' else 'Alterações de revisão salvas.' end
 where id=p_id returning *;
end; $$;
