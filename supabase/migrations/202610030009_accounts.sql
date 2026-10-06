begin;
create function public.link_verified_guests(p_user uuid) returns void language plpgsql security definer set search_path=public as $$ declare email_text text;begin
 select lower(email) into email_text from auth.users where id=p_user and email_confirmed_at is not null;
 if email_text is null then raise exception 'Email not verified';end if;
 perform pg_advisory_xact_lock(hashtextextended(email_text,0));
 insert into public.profiles(id,display_name) values(p_user,split_part(email_text,'@',1)) on conflict(id) do nothing;
 update public.parts_items set owner_type='private',owner_user_id=p_user,guest_email=null where lower(guest_email)=email_text and owner_type='guest' and email_confirmed_at is not null;
 update public.parts_wanted set owner_type='private',owner_user_id=p_user,guest_email=null where lower(guest_email)=email_text and owner_type='guest' and status<>'pending_email';
 update public.parts_trades set requester_type='private',requester_user_id=p_user where lower(requester_email)=email_text and requester_type='guest';
end $$;
revoke all on function public.link_verified_guests(uuid) from public,anon,authenticated;
grant execute on function public.link_verified_guests(uuid) to service_role;
commit;
