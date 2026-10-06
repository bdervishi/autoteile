begin;
create table public.commercial_requests (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),email text not null,
 offer text not null check(offer in ('starter','pro','plus','boost','sponsor','montage','affiliate')),
 name text not null check(length(name) between 2 and 120),note text not null default '' check(length(note)<=1000),
 item_id uuid references public.parts_items(id),quoted_price_chf numeric(10,2) not null check(quoted_price_chf>=0),
 status text not null default 'new' check(status in ('new','contacted','accepted','declined')),created_at timestamptz not null default now(),
 check(offer<>'boost' or item_id is not null)
);
create table public.commercial_request_log(id uuid primary key default gen_random_uuid(),request_id uuid not null references public.commercial_requests(id),actor_user_id uuid not null references auth.users(id),status text not null check(status in ('contacted','accepted','declined')),note text not null check(length(trim(note)) between 1 and 1000),created_at timestamptz not null default now());
alter table public.commercial_requests enable row level security;
alter table public.commercial_requests force row level security;
alter table public.commercial_request_log enable row level security;
alter table public.commercial_request_log force row level security;
revoke all on public.commercial_requests,public.commercial_request_log from anon,authenticated;
grant all on public.commercial_requests,public.commercial_request_log to service_role;
create function public.decide_commercial_request(p_actor uuid,p_id uuid,p_status text,p_note text) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'Forbidden'; end if;
 if p_status not in ('contacted','accepted','declined') or length(trim(p_note)) not between 1 and 1000 then return false; end if;
 perform id from public.commercial_requests where id=p_id for update;
 if not found then return false; end if;
 update public.commercial_requests set status=p_status where id=p_id;
 insert into public.commercial_request_log(request_id,actor_user_id,status,note) values(p_id,p_actor,p_status,p_note);
 return true;
end $$;
revoke all on function public.decide_commercial_request(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.decide_commercial_request(uuid,uuid,text,text) to service_role;
commit;
