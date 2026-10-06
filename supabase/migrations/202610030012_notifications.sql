begin;
create function public.notify_trade() returns trigger language plpgsql set search_path=public as $$ declare owner_id uuid;begin
 select owner_user_id into owner_id from public.parts_items where id=new.item_id;
 if tg_op='INSERT' then
 if owner_id is not null then insert into public.notifications(user_id,title,href) values(owner_id,'Neue Anfrage zu deinem Inserat','/teile/meine');end if;
 if new.requester_user_id is not null then insert into public.notifications(user_id,title,href) values(new.requester_user_id,'Deine Anfrage ist unterwegs','/teile/meine');end if;
 elsif old.status is distinct from new.status then
 insert into public.email_outbox(dedupe_key,recipient,subject,body,reply_to) select 'trade-status:'||new.id||':'||gen_random_uuid(),recipient,'Status deiner Anfrage aktualisiert',case new.status when 'accepted' then 'Die Anfrage wurde zugesagt.' when 'declined' then 'Die Anfrage wurde abgesagt.' when 'completed' then 'Die Übergabe ist abgeschlossen.' when 'cancelled' then 'Die Anfrage wurde zurückgezogen.' else 'Die Reservierung wurde aufgehoben.' end,reply_to from public.email_outbox where dedupe_key in ('inquiry:'||new.id||':owner','inquiry:'||new.id||':requester');
 if owner_id is not null then insert into public.notifications(user_id,title,href) values(owner_id,'Anfrage-Status aktualisiert','/teile/meine');end if;
 if new.requester_user_id is not null then insert into public.notifications(user_id,title,href) values(new.requester_user_id,'Anfrage-Status aktualisiert','/teile/meine');end if;
 end if;return new;
end $$;
create trigger trade_notifications after insert or update of status on public.parts_trades for each row execute function public.notify_trade();
create function public.notify_message() returns trigger language plpgsql set search_path=public as $$ declare recipient_id uuid;begin
 if new.sender_role='owner' then select requester_user_id into recipient_id from public.parts_trades where id=new.trade_id;else select i.owner_user_id into recipient_id from public.parts_items i join public.parts_trades t on t.item_id=i.id where t.id=new.trade_id;end if;
 if recipient_id is not null then insert into public.notifications(user_id,title,href) values(recipient_id,'Neue Nachricht in einer Anfrage','/teile/meine');end if;return new;
end $$;
create trigger message_notifications after insert on public.parts_messages for each row execute function public.notify_message();
commit;
