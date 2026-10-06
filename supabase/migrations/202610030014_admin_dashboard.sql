begin;
alter table public.parts_moderation_log drop constraint parts_moderation_log_action_check;
alter table public.parts_moderation_log add constraint parts_moderation_log_action_check check(action in ('auto_hide','withdraw','delete','unhide','dismiss','hide','verify_business','unverify_business'));
create function public.admin_manage_entry(p_actor uuid,p_id uuid,p_kind text,p_action text,p_reason text) returns boolean language plpgsql security definer set search_path=public as $$
declare entry_title text; actor_role text;
begin
 select role into actor_role from public.profiles where id=p_actor;
 if actor_role is null or actor_role not in ('admin','moderator') then raise exception 'Forbidden'; end if;
 if length(trim(p_reason))=0 or length(p_reason)>1000 then return false; end if;
 if p_kind='item' and p_action in ('hide','unhide') then
  select title into entry_title from public.parts_items where id=p_id for update;
  if entry_title is null then return false; end if;
  update public.parts_items set moderation_hidden_at=case when p_action='hide' then now() else null end where id=p_id;
  insert into public.parts_moderation_log(item_id,item_title,action,reason,actor_user_id) values(p_id,entry_title,p_action,p_reason,p_actor);
 elsif p_kind='business' and p_action in ('verify','unverify') then
  if actor_role<>'admin' then raise exception 'Forbidden'; end if;
  select name into entry_title from public.businesses where id=p_id for update;
  if entry_title is null then return false; end if;
  update public.businesses set verified_at=case when p_action='verify' then now() else null end where id=p_id;
  insert into public.parts_moderation_log(item_title,action,reason,actor_user_id) values(entry_title,case when p_action='verify' then 'verify_business' else 'unverify_business' end,p_reason,p_actor);
 else return false; end if;
 return true;
end $$;
revoke all on function public.admin_manage_entry(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.admin_manage_entry(uuid,uuid,text,text,text) to service_role;
commit;
