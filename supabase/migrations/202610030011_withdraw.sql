begin;
create function public.withdraw_owned_listing(p_item uuid,p_user uuid,p_email text) returns boolean language plpgsql security definer set search_path=public as $$ declare i public.parts_items;begin
 select * into i from public.parts_items where id=p_item for update;if i.id is null or i.status<>'available' then return false;end if;
 if not (p_user is not null and i.owner_user_id=p_user or p_email is not null and i.owner_user_id is null and i.guest_email=p_email) then return false;end if;
 -- Prevent SQL NULL from being mistaken for an authorised comparison.
 if p_user is null and p_email is null then return false;end if;
 if p_user is not null and i.owner_user_id is distinct from p_user then return false;end if;
 if p_email is not null and (i.owner_user_id is not null or i.guest_email is distinct from p_email) then return false;end if;
 update public.parts_items set status='withdrawn' where id=i.id;
 update public.parts_trades set status='cancelled' where item_id=i.id and status='requested';return true;
end $$;
revoke all on function public.withdraw_owned_listing(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.withdraw_owned_listing(uuid,uuid,text) to service_role;
commit;
