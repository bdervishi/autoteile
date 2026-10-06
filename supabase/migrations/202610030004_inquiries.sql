begin;
create function public.create_inquiry(p_trade jsonb,p_tokens jsonb,p_mails jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare trade public.parts_trades;tok jsonb;mail jsonb;locked uuid;
begin
 trade=jsonb_populate_record(null::public.parts_trades,p_trade);
 select id into locked from public.parts_items where id=trade.item_id and status in ('available','reserved') and moderation_hidden_at is null and email_confirmed_at is not null for update;
 if locked is null then raise exception 'Item unavailable';end if;
 insert into public.parts_trades(id,item_id,requester_type,requester_user_id,requester_email,requester_name,message,offer_back,access_token_hash,twint_requested) values(trade.id,trade.item_id,trade.requester_type,trade.requester_user_id,trade.requester_email,trade.requester_name,trade.message,trade.offer_back,trade.access_token_hash,trade.twint_requested);
 insert into public.parts_messages(trade_id,sender_role,body) values(trade.id,'requester',trade.message);
 for tok in select * from jsonb_array_elements(p_tokens) loop insert into public.access_tokens(token_hash,subject_id,purpose,expires_at) values(tok->>'token_hash',(tok->>'subject_id')::uuid,tok->>'purpose',(tok->>'expires_at')::timestamptz);end loop;
 for mail in select * from jsonb_array_elements(p_mails) loop insert into public.email_outbox(dedupe_key,recipient,subject,body,reply_to) values(mail->>'dedupe_key',mail->>'recipient',mail->>'subject',mail->>'body',mail->>'reply_to');end loop;
 return trade.id;
end $$;
revoke all on function public.create_inquiry(jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_inquiry(jsonb,jsonb,jsonb) to service_role;
commit;
