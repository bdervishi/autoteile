begin;
alter table public.email_outbox add column locked_until timestamptz,add column lease_id uuid;
create function public.claim_outbox(p_limit int default 10) returns setof public.email_outbox language sql security definer set search_path=public as $$
 update public.email_outbox set locked_until=now()+interval '5 minutes',lease_id=gen_random_uuid(),attempts=attempts+1 where id in (select id from public.email_outbox where sent_at is null and available_at<=now() and (locked_until is null or locked_until<now()) and attempts<10 order by created_at for update skip locked limit least(p_limit,20)) returning *;
$$;
create function public.process_inbound_reply(p_event text,p_trade uuid,p_role text,p_sender text,p_body text) returns boolean language plpgsql security definer set search_path=public as $$
declare t public.parts_trades;i public.parts_items;email_text text;inserted text;begin
 select * into t from public.parts_trades where id=p_trade for update;if t.id is null then return false;end if;select * into i from public.parts_items where id=t.item_id;
 if p_role='owner' then email_text=coalesce(i.guest_email,(select email from auth.users where id=i.owner_user_id));elsif p_role='requester' then email_text=coalesce(t.requester_email,(select email from auth.users where id=t.requester_user_id));else return false;end if;
 if email_text is null or lower(email_text)<>lower(p_sender) then return false;end if;
 insert into public.webhook_events(event_id,provider) values(p_event,'postal') on conflict(event_id) do nothing returning event_id into inserted;if inserted is null then return true;end if;
 if t.status not in ('requested','accepted') then insert into public.email_outbox(dedupe_key,recipient,subject,body) values('closed-reply:'||t.id||':'||p_role||':'||to_char(now() at time zone 'Europe/Zurich','YYYY-MM-DD'),email_text,'Diese Anfrage ist abgeschlossen','Zu dieser Anfrage können keine Nachrichten mehr hinzugefügt werden.') on conflict(dedupe_key) do nothing;return true;end if;
 return public.add_trade_message(t.id,p_role,p_body);
end $$;
create function public.enqueue_wanted_matches(p_origin text) returns integer language plpgsql security definer set search_path=public as $$
declare m record;found uuid;recipient_email text;counter int=0;begin
 for m in select w.id wanted_id,i.id item_id,w.group_title,i.title,w.guest_email,w.owner_user_id from public.parts_wanted w join public.parts_items i on w.category=i.category
 where w.status='active' and w.expires_at>now() and i.status='available' and i.email_confirmed_at is not null and i.moderation_hidden_at is null
 and i.condition<=w.min_condition
 and (coalesce(w.oem_number,'')='' or lower(w.oem_number)=lower(i.oem_number))
 and (coalesce(w.make,'')='' and coalesce(w.model,'')='' and w.year is null or exists(select 1 from jsonb_array_elements(i.fits) f where (coalesce(w.make,'')='' or lower(f->>'make')=lower(w.make)) and (coalesce(w.model,'')='' or lower(f->>'model')=lower(w.model)) and (w.year is null or (f->>'year_from')::int<=w.year and (f->>'year_to')::int>=w.year)))
 and (w.tire_width is null or w.tire_width=i.tire_width) and (w.tire_ratio is null or w.tire_ratio=i.tire_ratio) and (w.rim_diameter is null or w.rim_diameter=i.rim_diameter) and (w.tire_season is null or w.tire_season=i.tire_season)
 and (w.offer='kauf' and i.offer_type in ('verkauf','verkauf_bar') or w.offer='tausch' and i.offer_type='tausch' or w.offer='gratis' and i.offer_type='gratis')
 and (w.max_price_chf is null or i.price_chf<=w.max_price_chf)
 and (w.owner_user_id is null or i.owner_user_id is null or w.owner_user_id<>i.owner_user_id)
 and not (w.guest_email is not null and i.guest_email is not null and lower(w.guest_email)=lower(i.guest_email))
 and not exists(select 1 from public.parts_wanted_matches wm where wm.wanted_id=w.id and wm.item_id=i.id) limit 500
 loop
 insert into public.parts_wanted_matches(wanted_id,item_id) values(m.wanted_id,m.item_id) on conflict do nothing returning wanted_id into found;
 if found is not null then recipient_email=coalesce(m.guest_email,(select email from auth.users where id=m.owner_user_id));
 insert into public.email_outbox(dedupe_key,recipient,subject,body) values('wanted-match:'||m.wanted_id||':'||m.item_id,recipient_email,'Passendes Inserat gefunden','Zu deinem Gesuch «'||m.group_title||'» passt dieses Inserat: '||m.title||E'\n\n'||p_origin||'/teile/'||m.item_id) on conflict(dedupe_key) do nothing;counter=counter+1;
 end if;end loop;return counter;
end $$;
revoke all on function public.claim_outbox(int),public.process_inbound_reply(text,uuid,text,text,text),public.enqueue_wanted_matches(text) from public,anon,authenticated;
grant execute on function public.claim_outbox(int),public.process_inbound_reply(text,uuid,text,text,text),public.enqueue_wanted_matches(text) to service_role;
commit;
