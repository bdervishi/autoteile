begin;
create function public.create_wanted(p_articles jsonb,p_hash text,p_mail jsonb) returns boolean language plpgsql security definer set search_path=public as $$
declare count_open int;article jsonb;w public.parts_wanted;email_text text;group_uuid uuid;begin
 if jsonb_array_length(p_articles) not between 1 and 5 then raise exception 'Invalid article count';end if;
 email_text=p_articles->0->>'guest_email';group_uuid=(p_articles->0->>'group_id')::uuid;
 perform pg_advisory_xact_lock(hashtextextended(email_text,0));
 select count(*) into count_open from public.parts_wanted where guest_email=email_text and status in ('pending_email','pending_review','active');
 if count_open+jsonb_array_length(p_articles)>10 then return false;end if;
 for article in select * from jsonb_array_elements(p_articles) loop
 w=jsonb_populate_record(null::public.parts_wanted,article);
 if w.guest_email is distinct from email_text or w.group_id<>group_uuid then raise exception 'Invalid group';end if;
 insert into public.parts_wanted(id,group_id,group_title,owner_type,owner_name,guest_email,category,make,model,oem_number,min_condition,offer,max_price_chf,note,pickup_zip,auto_check) values(w.id,w.group_id,w.group_title,'guest',w.owner_name,email_text,w.category,w.make,w.model,w.oem_number,w.min_condition,w.offer,w.max_price_chf,w.note,w.pickup_zip,w.auto_check);
 end loop;
 insert into public.access_tokens(token_hash,subject_id,purpose,expires_at) values(p_hash,group_uuid,'wanted-confirm',now()+interval '7 days');
 insert into public.email_outbox(dedupe_key,recipient,subject,body) values('wanted-confirm:'||group_uuid,email_text,p_mail->>'subject',p_mail->>'body');return true;
end $$;
create function public.confirm_wanted(p_group uuid,p_hash text) returns boolean language plpgsql security definer set search_path=public as $$ declare found uuid;begin
 update public.access_tokens set used_at=now() where token_hash=p_hash and subject_id=p_group and purpose='wanted-confirm' and used_at is null and expires_at>now() returning subject_id into found;
 if found is null then return false;end if;
 update public.parts_wanted set status='pending_review' where group_id=p_group and status='pending_email';
 insert into public.notifications(user_id,title,href) select id,'Neues Gesuch zur Prüfung','/admin/gesuche' from public.profiles where role in ('moderator','admin');return true;
end $$;
revoke all on function public.create_wanted(jsonb,text,jsonb),public.confirm_wanted(uuid,text) from public,anon,authenticated;
grant execute on function public.create_wanted(jsonb,text,jsonb),public.confirm_wanted(uuid,text) to service_role;
commit;
