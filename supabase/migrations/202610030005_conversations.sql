begin;
alter table public.parts_trades add column owner_message_notified_at timestamptz,add column requester_message_notified_at timestamptz;
create function public.add_trade_message(p_trade_id uuid,p_role text,p_body text) returns boolean language plpgsql security definer set search_path=public as $$
declare t public.parts_trades;i public.parts_items;email text;last_notice timestamptz;begin
 if p_role not in ('owner','requester') or length(p_body) not between 1 and 2000 then raise exception 'Invalid message';end if;
 select * into t from public.parts_trades where id=p_trade_id for update;if t.id is null or t.status not in ('requested','accepted') then return false;end if;
 select * into i from public.parts_items where id=t.item_id;
 insert into public.parts_messages(trade_id,sender_role,body) values(t.id,p_role,p_body);
 if p_role='owner' then email=coalesce(t.requester_email,(select u.email from auth.users u where u.id=t.requester_user_id));last_notice=t.requester_message_notified_at;else email=coalesce(i.guest_email,(select u.email from auth.users u where u.id=i.owner_user_id));last_notice=t.owner_message_notified_at;end if;
 if email is not null and (last_notice is null or last_notice<now()-interval '15 minutes') then
 -- Reuse the original signed Reply-To. Never reveal counterpart addresses.
 insert into public.email_outbox(dedupe_key,recipient,subject,body,reply_to) select 'message:'||gen_random_uuid(),email,'Neue Nachricht zu '||i.title,p_body,reply_to from public.email_outbox where dedupe_key='inquiry:'||t.id||':'||case when p_role='owner' then 'requester' else 'owner' end;
 if p_role='owner' then update public.parts_trades set requester_message_notified_at=now() where id=t.id;else update public.parts_trades set owner_message_notified_at=now() where id=t.id;end if;
 end if;return true;
end $$;
create function public.transition_trade(p_trade uuid,p_role text,p_action text) returns boolean language plpgsql security definer set search_path=public as $$
declare t public.parts_trades;i public.parts_items;new_status text;begin
 -- Consistent item -> trade lock order across all operations.
 select * into i from public.parts_items where id=(select item_id from public.parts_trades where id=p_trade) for update;
 select * into t from public.parts_trades where id=p_trade for update;
 if t.id is null then return false;end if;
 if p_role='requester' and p_action='cancel' and t.status in ('requested','accepted') then
 update public.parts_trades set status='cancelled' where id=t.id;if t.status='accepted' then update public.parts_items set status='available' where id=i.id and status='reserved';end if;
 elsif p_role='owner' then
 if p_action='accept' and t.status='requested' and i.status='available' then update public.parts_trades set status='accepted',responded_at=now() where id=t.id;update public.parts_items set status='reserved' where id=i.id;
 elsif p_action='decline' and t.status='requested' then update public.parts_trades set status='declined',responded_at=now() where id=t.id;
 elsif p_action='release' and t.status='accepted' then update public.parts_trades set status='requested' where id=t.id;update public.parts_items set status='available' where id=i.id and status='reserved';
 elsif p_action='complete' and t.status='accepted' then update public.parts_trades set status='completed',completed_at=now() where id=t.id;update public.parts_items set status='completed' where id=i.id;update public.parts_trades set status='declined',response_message='Das Teil wurde bereits übergeben.',responded_at=now() where item_id=i.id and id<>t.id and status='requested';
 else return false;end if;
 else return false;end if;
 insert into public.parts_messages(trade_id,sender_role,body) values(t.id,p_role,case p_action when 'accept' then 'Anfrage zugesagt. Das Teil ist reserviert.' when 'decline' then 'Anfrage abgesagt.' when 'release' then 'Reservierung aufgehoben.' when 'complete' then 'Übergabe erledigt.' else 'Anfrage zurückgezogen.' end);
 return true;
end $$;
create function public.release_twint(p_trade uuid,p_hash text) returns boolean language plpgsql security definer set search_path=public as $$
declare t public.parts_trades;i public.parts_items;recipient_email text;body_text text;begin
 select * into i from public.parts_items where id=(select item_id from public.parts_trades where id=p_trade) for update;
 select * into t from public.parts_trades where id=p_trade for update;
 if not exists(select 1 from public.access_tokens where token_hash=p_hash and subject_id=p_trade and purpose='twint-release' and expires_at>now()) then return false;end if;
 if t.twint_released_at is not null then return true;end if;
 if not t.twint_requested or t.status not in ('requested','accepted') or i.payment_mode<>'twint-direct' or i.twint_phone is null then return false;end if;
 update public.parts_trades set twint_released_at=now() where id=t.id and twint_released_at is null;
 body_text='TWINT-Nummer freigegeben: '||i.twint_phone||'. Betrag: CHF '||i.price_chf||'. Bitte vor der Zahlung die Übergabe absprechen.';
 insert into public.parts_messages(trade_id,sender_role,body) values(t.id,'owner',body_text);
 recipient_email=coalesce(t.requester_email,(select email from auth.users where id=t.requester_user_id));
 insert into public.email_outbox(dedupe_key,recipient,subject,body,reply_to) values('twint-released:'||t.id,recipient_email,'TWINT-Nummer für '||i.title,body_text,(select reply_to from public.email_outbox where dedupe_key='inquiry:'||t.id||':requester')) on conflict(dedupe_key) do nothing;
 update public.access_tokens set used_at=now() where token_hash=p_hash;
 return true;
end $$;
revoke all on function public.add_trade_message(uuid,text,text),public.transition_trade(uuid,text,text),public.release_twint(uuid,text) from public,anon,authenticated;
grant execute on function public.add_trade_message(uuid,text,text),public.transition_trade(uuid,text,text),public.release_twint(uuid,text) to service_role;
commit;
