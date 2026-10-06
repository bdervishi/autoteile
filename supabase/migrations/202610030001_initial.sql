begin;
create extension if not exists pgcrypto;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null, role text not null default 'private' check(role in ('private','business','moderator','admin')), created_at timestamptz not null default now());
create table public.businesses (id uuid primary key default gen_random_uuid(),owner_user_id uuid not null references auth.users(id),slug text not null unique,name text not null,uid_number text not null check(uid_number ~ '^CHE-[0-9]{3}\.[0-9]{3}\.[0-9]{3}$'),address text not null,zip text not null check(zip ~ '^[0-9]{4}$'),city text not null,canton text not null,phone text,website text,logo_url text,verified_at timestamptz,created_at timestamptz not null default now());
create type public.part_category as enum ('reifen','felgen','kompletträder','motor_antrieb','karosserie','beleuchtung','innenraum','elektronik_multimedia','fahrwerk_bremsen','auspuff','dachträger_anhängerkupplung','pflege_werkzeug','kindersitze','zubehör','sonstiges');
create type public.part_condition as enum ('neu','neuwertig','gebraucht_gut','gebraucht','defekt_bastler');
create type public.part_offer as enum ('tausch','gratis','verkauf','verkauf_bar');
-- Immutable JSON traversal used by the generated German full-text search column.
create function public.fits_search(value jsonb) returns text language sql immutable strict set search_path = public as $$ select coalesce(string_agg(concat_ws(' ',e->>'make',e->>'model'),' '),'') from jsonb_array_elements(value) e $$;
create table public.parts_items (
 id uuid primary key default gen_random_uuid(),owner_type text not null check(owner_type in ('private','business','guest')),owner_user_id uuid references auth.users(id),business_id uuid references public.businesses(id),owner_name text not null,guest_email text,
 title text not null check(length(title) between 2 and 120),description text not null check(length(description)<=2000),category public.part_category not null,condition public.part_condition not null,
 fits jsonb not null default '[]' check(jsonb_typeof(fits)='array' and jsonb_array_length(fits)<=10),fits_note text,oem_number text,manufacturer text,
 tire_width integer,tire_ratio integer,rim_diameter numeric,tire_season text check(tire_season in ('sommer','winter','ganzjahr')),tire_dot text check(tire_dot ~ '^(0[1-9]|[1-4][0-9]|5[0-3])[0-9]{2}$'),tread_mm numeric check(tread_mm>=0),rim_bolt_pattern text,rim_offset_et numeric,rim_width numeric,quantity integer not null default 1 check(quantity between 1 and 4),
 photos text[] not null default '{}' check(cardinality(photos)<=5),offer_type public.part_offer not null,price_chf numeric(10,2) check(price_chf>=0),swap_for text check(length(swap_for)<=120),negotiable boolean not null default false,
 shipping_possible boolean not null default false,pickup_zip text not null check(pickup_zip ~ '^[0-9]{4}$'),pickup_canton text not null check(pickup_canton in ('AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG','TI','UR','VD','VS','ZG','ZH','FL')),
 payment_mode text check(payment_mode in ('stripe','twint-direct')),twint_phone text,status text not null default 'available' check(status in ('available','reserved','completed','withdrawn')),email_confirmed_at timestamptz,moderation_hidden_at timestamptz,wanted_id uuid,
 search_tsv tsvector generated always as (to_tsvector('german',coalesce(title,'')||' '||coalesce(description,'')||' '||coalesce(manufacturer,'')||' '||coalesce(oem_number,'')||' '||public.fits_search(fits))) stored,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((owner_type='guest' and guest_email is not null and owner_user_id is null) or (owner_type<>'guest' and owner_user_id is not null)),
 check(owner_type<>'business' or business_id is not null),
 check(offer_type not in ('verkauf','verkauf_bar') or price_chf>0),check(payment_mode<>'twint-direct' or twint_phone is not null)
);
create index parts_items_status_created on public.parts_items(status,created_at desc,id desc);
create index parts_items_category on public.parts_items(category);
create index parts_items_canton on public.parts_items(pickup_canton);
create index parts_items_fits on public.parts_items using gin(fits);
create index parts_items_search on public.parts_items using gin(search_tsv);
create index parts_items_oem on public.parts_items(oem_number);
create table public.parts_trades (
 id uuid primary key default gen_random_uuid(),item_id uuid not null references public.parts_items(id),requester_type text not null check(requester_type in ('private','business','guest')),requester_user_id uuid references auth.users(id),requester_email text,requester_name text not null,
 message text not null check(length(message) between 2 and 2000),offer_back text,status text not null default 'requested' check(status in ('requested','accepted','declined','completed','cancelled')),response_message text,access_token_hash text unique,
 owner_notified_at timestamptz,responded_at timestamptz,completed_at timestamptz,twint_requested boolean not null default false,twint_released_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((requester_type='guest' and requester_email is not null and requester_user_id is null) or (requester_type<>'guest' and requester_user_id is not null))
);
create unique index parts_trades_open_user on public.parts_trades(item_id,requester_user_id) where status in ('requested','accepted') and requester_user_id is not null;
create unique index parts_trades_open_guest on public.parts_trades(item_id,lower(requester_email)) where status in ('requested','accepted') and requester_user_id is null;
create unique index parts_trades_one_accepted on public.parts_trades(item_id) where status='accepted';
create table public.parts_messages (id uuid primary key default gen_random_uuid(),trade_id uuid not null references public.parts_trades(id) on delete cascade,sender_role text not null check(sender_role in ('owner','requester')),body text not null check(length(body) between 1 and 2000),created_at timestamptz not null default now());
create table public.parts_wanted (
 id uuid primary key default gen_random_uuid(),group_id uuid not null,group_title text not null check(length(group_title) between 2 and 120),owner_type text not null check(owner_type in ('private','business','guest')),owner_user_id uuid references auth.users(id),owner_name text not null,guest_email text,category public.part_category not null,
 make text,model text,year integer,oem_number text,tire_width integer,tire_ratio integer,rim_diameter numeric,tire_season text,min_condition public.part_condition not null,offer text not null check(offer in ('tausch','gratis','kauf')),max_price_chf numeric(10,2),swap_offer text check(length(swap_offer)<=120),note text check(length(note)<=200),pickup_zip text not null check(pickup_zip ~ '^[0-9]{4}$'),
 status text not null default 'pending_email' check(status in ('pending_email','pending_review','active','rejected','expired','fulfilled','withdrawn')),auto_check jsonb not null default '{}',reject_reason text,reviewed_by uuid references auth.users(id),reviewed_at timestamptz,expires_at timestamptz not null default now()+interval '30 days',expiry_reminded_at timestamptz,created_at timestamptz not null default now(),
 check(status<>'rejected' or length(reject_reason)>0),check((owner_type='guest' and guest_email is not null and owner_user_id is null) or (owner_type<>'guest' and owner_user_id is not null))
);
alter table public.parts_items add foreign key (wanted_id) references public.parts_wanted(id);
create index wanted_active on public.parts_wanted(category,expires_at) where status='active';
create index wanted_group on public.parts_wanted(group_id);
create table public.parts_wanted_matches (wanted_id uuid not null references public.parts_wanted(id) on delete cascade,item_id uuid not null references public.parts_items(id) on delete cascade,notified_at timestamptz,primary key(wanted_id,item_id));
create table public.parts_reports (id uuid primary key default gen_random_uuid(),item_id uuid not null references public.parts_items(id) on delete cascade,reason text not null check(reason in ('betrug','gestohlen','verboten','unangemessen','spam','falsche_angaben','sonstiges')),note text check(length(note)<=1000),reporter_ip_hash text not null,reporter_user_id uuid references auth.users(id),status text not null default 'open' check(status in ('open','dismissed','actioned')),handled_by uuid references auth.users(id),handled_at timestamptz,created_at timestamptz not null default now());
create unique index reports_open_ip on public.parts_reports(item_id,reporter_ip_hash) where status='open';
create table public.parts_moderation_log (id uuid primary key default gen_random_uuid(),item_id uuid,item_title text not null,action text not null check(action in ('auto_hide','withdraw','delete','unhide','dismiss')),reason text,actor_user_id uuid references auth.users(id),report_count integer,created_at timestamptz not null default now());
create table public.parts_ratings (id uuid primary key default gen_random_uuid(),rater_id uuid not null references auth.users(id),rated_user_id uuid not null references auth.users(id),item_id uuid not null references public.parts_items(id),stars integer not null check(stars between 1 and 5),comment text check(length(comment)<=1000),created_at timestamptz not null default now(),unique(rater_id,item_id),check(rater_id<>rated_user_id));
create table public.parts_purchases (id uuid primary key default gen_random_uuid(),item_id uuid not null references public.parts_items(id),buyer_user_id uuid not null references auth.users(id),seller_user_id uuid not null references auth.users(id),amount_chf numeric(10,2) not null,platform_fee_chf numeric(10,2) not null,stripe_session_id text unique,status text not null default 'pending' check(status in ('pending','paid','expired','refunded')),expires_at timestamptz not null default now()+interval '30 minutes',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index purchase_one_open on public.parts_purchases(item_id) where status='pending';
create table public.platform_settings (id boolean primary key default true check(id),value jsonb not null);
insert into public.platform_settings(value) values ('{"guestListingsEnabled":true,"ratingEnabled":true,"stripeSaleEnabled":false,"twintDirectEnabled":true,"maxPhotosPerListing":5,"platformFeePercent":10,"guestListingsPerIpPerDay":3,"wantedEnabled":true}');
create table public.access_tokens (token_hash text primary key,subject_id uuid not null,purpose text not null,expires_at timestamptz not null,used_at timestamptz,created_at timestamptz not null default now());
create table public.email_outbox (id uuid primary key default gen_random_uuid(),dedupe_key text not null unique,recipient text not null,subject text not null,body text not null,reply_to text,attempts integer not null default 0,available_at timestamptz not null default now(),sent_at timestamptz,last_error text,created_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),title text not null,href text,read_at timestamptz,created_at timestamptz not null default now());
create table public.webhook_events (event_id text primary key,provider text not null,processed_at timestamptz not null default now());
create table public.rate_limits (key text primary key,hits integer not null default 0,expires_at timestamptz not null);
create function public.consume_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path=public as $$
declare counter integer;
begin
 if p_limit<1 or p_seconds<1 then return false; end if;
 insert into public.rate_limits(key,hits,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds)) on conflict(key) do update set hits=case when rate_limits.expires_at<=now() then 1 else rate_limits.hits+1 end,expires_at=case when rate_limits.expires_at<=now() then now()+make_interval(secs=>p_seconds) else rate_limits.expires_at end returning hits into counter;
 return counter<=p_limit;
end $$;
-- Every service function is explicitly revoked from clients.
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;
create function public.set_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now();return new;end $$;
create trigger items_updated before update on public.parts_items for each row execute function public.set_updated_at();
create trigger trades_updated before update on public.parts_trades for each row execute function public.set_updated_at();
create trigger purchases_updated before update on public.parts_purchases for each row execute function public.set_updated_at();
-- Lock item before inserting reports so simultaneous reports cannot miss the threshold.
create function public.report_lock() returns trigger language plpgsql set search_path=public as $$ begin perform 1 from public.parts_items where id=new.item_id for update;return new;end $$;
create trigger report_serialise before insert on public.parts_reports for each row execute function public.report_lock();
create function public.report_auto_hide() returns trigger language plpgsql set search_path=public as $$ declare count_open integer;hidden uuid;title_copy text;begin
 select count(*) into count_open from public.parts_reports where item_id=new.item_id and status='open';
 if count_open>=3 then update public.parts_items set moderation_hidden_at=now() where id=new.item_id and moderation_hidden_at is null returning id,title into hidden,title_copy;
 if hidden is not null then insert into public.parts_moderation_log(item_id,item_title,action,reason,report_count) values(hidden,title_copy,'auto_hide','Mindestens drei offene Meldungen',count_open);insert into public.notifications(user_id,title,href) select id,'Inserat automatisch ausgeblendet','/admin/meldungen' from public.profiles where role in ('admin','moderator');end if;end if;return new;
 end $$;
create trigger report_threshold after insert on public.parts_reports for each row execute function public.report_auto_hide();
create function public.ratings_immutable() returns trigger language plpgsql set search_path=public as $$ begin raise exception 'Ratings are immutable';end $$;
create trigger ratings_no_update before update on public.parts_ratings for each row execute function public.ratings_immutable();
-- RLS deny-all: no policies; no anon/authenticated table grants.
do $$ declare tab text;begin foreach tab in array array['profiles','businesses','parts_items','parts_trades','parts_messages','parts_wanted','parts_wanted_matches','parts_reports','parts_moderation_log','parts_ratings','parts_purchases','platform_settings','access_tokens','email_outbox','notifications','webhook_events','rate_limits'] loop execute format('alter table public.%I enable row level security',tab);execute format('alter table public.%I force row level security',tab);execute format('revoke all on public.%I from anon, authenticated',tab);execute format('grant all on public.%I to service_role',tab);end loop;end $$;
-- Bucket remains public-read. No client write policy is created.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('parts-photos','parts-photos',true,2097152,array['image/webp','image/jpeg']) on conflict(id) do update set public=true,file_size_limit=2097152,allowed_mime_types=array['image/webp','image/jpeg'];
commit;
