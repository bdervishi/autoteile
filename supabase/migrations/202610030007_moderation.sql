begin;
create function public.moderate_entry(p_actor uuid,p_id uuid,p_kind text,p_action text,p_reason text) returns boolean language plpgsql security definer set search_path=public as $$
declare w public.parts_wanted;r public.parts_reports;i public.parts_items;email text;begin
 if not exists(select 1 from public.profiles where id=p_actor and role in ('moderator','admin')) then raise exception 'Forbidden';end if;
 if p_kind='wanted' then
 select * into w from public.parts_wanted where id=p_id and status='pending_review' for update;if w.id is null then return false;end if;
 if p_action='approve' then update public.parts_wanted set status='active',reviewed_by=p_actor,reviewed_at=now(),expires_at=now()+interval '30 days' where group_id=w.group_id and status='pending_review';
 elsif p_action='reject' and length(trim(p_reason))>0 then update public.parts_wanted set status='rejected',reject_reason=p_reason,reviewed_by=p_actor,reviewed_at=now() where group_id=w.group_id and status='pending_review';else return false;end if;
 email=coalesce(w.guest_email,(select u.email from auth.users u where u.id=w.owner_user_id));
 insert into public.email_outbox(dedupe_key,recipient,subject,body) values('wanted-review:'||w.group_id,email,case when p_action='approve' then 'Dein Gesuch ist veröffentlicht' else 'Dein Gesuch wurde abgelehnt' end,case when p_action='approve' then 'Dein Gesuch «'||w.group_title||'» ist jetzt 30 Tage aktiv.' else p_reason end) on conflict(dedupe_key) do nothing;return true;
 elsif p_kind='report' then
 select * into i from public.parts_items where id=(select item_id from public.parts_reports where id=p_id) for update;select * into r from public.parts_reports where id=p_id and status='open' for update;if r.id is null or i.id is null then return false;end if;
 if p_action='unhide' then update public.parts_items set moderation_hidden_at=null where id=i.id;
 elsif p_action='withdraw' then update public.parts_items set status='withdrawn' where id=i.id;
 elsif p_action='delete' then update public.parts_items set status='withdrawn',moderation_hidden_at=now(),description='Inserat von der Moderation entfernt.',photos='{}' where id=i.id;
 elsif p_action<>'dismiss' then return false;end if;
 update public.parts_reports set status=case when p_action='dismiss' then 'dismissed' else 'actioned' end,handled_by=p_actor,handled_at=now() where item_id=i.id and status='open';
 insert into public.parts_moderation_log(item_id,item_title,action,reason,actor_user_id) values(i.id,i.title,p_action,p_reason,p_actor);return true;
 end if;return false;
end $$;
revoke all on function public.moderate_entry(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.moderate_entry(uuid,uuid,text,text,text) to service_role;
commit;
