begin;
create table public.crm_contacts(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 2 and 120),email text not null check(length(email)<=254),company text not null default '' check(length(company)<=120),phone text not null default '' check(length(phone)<=40),stage text not null default 'lead' check(stage in ('lead','contacted','pilot','customer','closed')),note text not null default '' check(length(note)<=2000),next_contact_at date,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.crm_activity(id uuid primary key default gen_random_uuid(),contact_id uuid not null references public.crm_contacts(id),actor_id uuid not null references auth.users(id),kind text not null check(kind in ('created','updated','note')),body text not null check(length(body) between 1 and 2000),created_at timestamptz not null default now());
create index crm_due on public.crm_contacts(next_contact_at) where stage<>'closed';
alter table public.crm_contacts enable row level security;alter table public.crm_contacts force row level security;
alter table public.crm_activity enable row level security;alter table public.crm_activity force row level security;
revoke all on public.crm_contacts,public.crm_activity from anon,authenticated;grant all on public.crm_contacts,public.crm_activity to service_role;
create function public.crm_save_contact(p_actor uuid,p_contact jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid;oldstage text;begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'Forbidden';end if;
 cid=nullif(p_contact->>'id','')::uuid;
 if cid is null then
 insert into public.crm_contacts(name,email,company,phone,stage,note,next_contact_at,created_by) values(p_contact->>'name',p_contact->>'email',p_contact->>'company',p_contact->>'phone',p_contact->>'stage',p_contact->>'note',nullif(p_contact->>'nextContact','')::date,p_actor) returning id into cid;
 insert into public.crm_activity(contact_id,actor_id,kind,body) values(cid,p_actor,'created','Kontakt angelegt');
 else
 select stage into oldstage from public.crm_contacts where id=cid for update;if not found then return null;end if;
 update public.crm_contacts set name=p_contact->>'name',email=p_contact->>'email',company=p_contact->>'company',phone=p_contact->>'phone',stage=p_contact->>'stage',note=p_contact->>'note',next_contact_at=nullif(p_contact->>'nextContact','')::date,updated_at=now() where id=cid;
 insert into public.crm_activity(contact_id,actor_id,kind,body) values(cid,p_actor,'updated','Kontakt aktualisiert · Phase '||oldstage||' → '||(p_contact->>'stage'));
 end if;return cid;
end $$;
create function public.crm_add_note(p_actor uuid,p_contact uuid,p_body text) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'Forbidden';end if;
 perform id from public.crm_contacts where id=p_contact for update;if not found then return false;end if;
 insert into public.crm_activity(contact_id,actor_id,kind,body) values(p_contact,p_actor,'note',p_body);return true;
end $$;
revoke all on function public.crm_save_contact(uuid,jsonb),public.crm_add_note(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.crm_save_contact(uuid,jsonb),public.crm_add_note(uuid,uuid,text) to service_role;
commit;
begin;
create function public.admin_listing_trend(p_days integer) returns table(day text,count bigint) language sql security definer set search_path=public as $$
 select to_char(d::date,'YYYY-MM-DD'),count(i.id) from generate_series((now() at time zone 'Europe/Zurich')::date-(least(greatest(p_days,1),90)-1),(now() at time zone 'Europe/Zurich')::date,interval '1 day') d
 left join public.parts_items i on (i.created_at at time zone 'Europe/Zurich')::date=d::date group by d order by d;
$$;
revoke all on function public.admin_listing_trend(integer) from public,anon,authenticated;
grant execute on function public.admin_listing_trend(integer) to service_role;
commit;
begin;
alter table public.crm_contacts add column source_request_id uuid unique references public.commercial_requests(id);
create function public.crm_import_request(p_actor uuid,p_request uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid;r public.commercial_requests;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'Forbidden';end if;
 select * into r from public.commercial_requests where id=p_request for update;if not found then return null;end if;
 select id into cid from public.crm_contacts where source_request_id=p_request;if cid is not null then return cid;end if;
 insert into public.crm_contacts(name,email,stage,note,created_by,source_request_id) values(r.name,r.email,'lead',left(r.offer||' · '||r.note,2000),p_actor,p_request) returning id into cid;
 insert into public.crm_activity(contact_id,actor_id,kind,body) values(cid,p_actor,'created','Aus Partneranfrage übernommen');return cid;
end $$;
revoke all on function public.crm_import_request(uuid,uuid) from public,anon,authenticated;
grant execute on function public.crm_import_request(uuid,uuid) to service_role;
commit;
