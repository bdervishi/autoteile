begin;
create function public.create_listing(p_listing jsonb,p_token_hash text,p_mail jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare listing public.parts_items;
begin
 listing=jsonb_populate_record(null::public.parts_items,p_listing);
 insert into public.parts_items(id,owner_type,owner_user_id,business_id,owner_name,guest_email,title,description,category,condition,fits,fits_note,oem_number,manufacturer,tire_width,tire_ratio,rim_diameter,tire_season,tire_dot,tread_mm,rim_bolt_pattern,rim_offset_et,rim_width,quantity,photos,offer_type,price_chf,swap_for,negotiable,shipping_possible,pickup_zip,pickup_canton,payment_mode,twint_phone,email_confirmed_at,wanted_id) values(listing.id,listing.owner_type,listing.owner_user_id,listing.business_id,listing.owner_name,listing.guest_email,listing.title,listing.description,listing.category,listing.condition,coalesce(listing.fits,'[]'),listing.fits_note,listing.oem_number,listing.manufacturer,listing.tire_width,listing.tire_ratio,listing.rim_diameter,listing.tire_season,listing.tire_dot,listing.tread_mm,listing.rim_bolt_pattern,listing.rim_offset_et,listing.rim_width,listing.quantity,coalesce(listing.photos,'{}'),listing.offer_type,listing.price_chf,listing.swap_for,listing.negotiable,listing.shipping_possible,listing.pickup_zip,listing.pickup_canton,listing.payment_mode,listing.twint_phone,listing.email_confirmed_at,listing.wanted_id);
 if listing.owner_type='guest' then insert into public.access_tokens(token_hash,subject_id,purpose,expires_at) values(p_token_hash,listing.id,'listing-confirm',now()+interval '7 days');end if;
 insert into public.email_outbox(dedupe_key,recipient,subject,body) values('listing-created:'||listing.id,p_mail->>'recipient',p_mail->>'subject',p_mail->>'body');
 return listing.id;
end $$;
create function public.confirm_listing(p_id uuid,p_hash text) returns boolean language plpgsql security definer set search_path=public as $$
declare found uuid;begin
 update public.access_tokens set used_at=now() where token_hash=p_hash and subject_id=p_id and purpose='listing-confirm' and used_at is null and expires_at>now() returning subject_id into found;
 if found is null then return false;end if;
 update public.parts_items set email_confirmed_at=now() where id=found and email_confirmed_at is null;return true;
end $$;
create function public.create_management_token(p_hash text,p_subject uuid,p_mail jsonb) returns void language plpgsql security definer set search_path=public as $$ begin
 insert into public.access_tokens(token_hash,subject_id,purpose,expires_at) values(p_hash,p_subject,'management',now()+interval '7 days');
 insert into public.email_outbox(dedupe_key,recipient,subject,body) values('management:'||p_hash,p_mail->>'recipient',p_mail->>'subject',p_mail->>'body');
end $$;
revoke all on function public.create_listing(jsonb,text,jsonb),public.confirm_listing(uuid,text),public.create_management_token(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_listing(jsonb,text,jsonb),public.confirm_listing(uuid,text),public.create_management_token(text,uuid,jsonb) to service_role;
commit;
