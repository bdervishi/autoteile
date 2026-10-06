begin;
create function public.create_rating(p_rater uuid,p_rated uuid,p_item uuid,p_stars int,p_comment text) returns boolean language plpgsql security definer set search_path=public as $$ begin
 if not exists(select 1 from public.parts_trades t join public.parts_items i on i.id=t.item_id where t.item_id=p_item and t.status='completed' and ((i.owner_user_id=p_rater and t.requester_user_id=p_rated) or (t.requester_user_id=p_rater and i.owner_user_id=p_rated))) then return false;end if;
 if not coalesce((select (value->>'ratingEnabled')::boolean from public.platform_settings where id=true),false) then return false;end if;
 insert into public.parts_ratings(rater_id,rated_user_id,item_id,stars,comment) values(p_rater,p_rated,p_item,p_stars,p_comment) on conflict(rater_id,item_id) do nothing;return found;
end $$;
create function public.remind_wanted(p_group uuid,p_hash text,p_origin text,p_body text) returns boolean language plpgsql security definer set search_path=public as $$ declare w public.parts_wanted;recipient_email text;begin
 select * into w from public.parts_wanted where group_id=p_group and status='active' and expires_at between now() and now()+interval '3 days' and expiry_reminded_at is null order by id limit 1 for update;
 if w.id is null then return false;end if;
 update public.parts_wanted set expiry_reminded_at=now() where group_id=p_group and expiry_reminded_at is null;
 insert into public.access_tokens(token_hash,subject_id,purpose,expires_at) values(p_hash,p_group,'wanted-renew',now()+interval '7 days');
 recipient_email=coalesce(w.guest_email,(select email from auth.users where id=w.owner_user_id));
 insert into public.email_outbox(dedupe_key,recipient,subject,body) values('wanted-expiry:'||w.group_id||':'||w.expires_at,recipient_email,'Dein Gesuch läuft bald ab',p_body) on conflict(dedupe_key) do nothing;return true;
end $$;
create function public.renew_wanted(p_group uuid,p_hash text) returns boolean language plpgsql security definer set search_path=public as $$ declare token_subject uuid;begin
 update public.access_tokens set used_at=now() where token_hash=p_hash and subject_id=p_group and purpose='wanted-renew' and expires_at>now() and used_at is null returning subject_id into token_subject;if token_subject is null then return false;end if;
 update public.parts_wanted set status='active',expires_at=now()+interval '30 days',expiry_reminded_at=null where group_id=p_group and status in ('active','expired');return found;
end $$;
revoke all on function public.create_rating(uuid,uuid,uuid,int,text),public.remind_wanted(uuid,text,text,text),public.renew_wanted(uuid,text) from public,anon,authenticated;
grant execute on function public.create_rating(uuid,uuid,uuid,int,text),public.remind_wanted(uuid,text,text,text),public.renew_wanted(uuid,text) to service_role;
commit;
