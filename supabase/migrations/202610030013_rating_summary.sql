begin;
create function public.public_seller_rating(p_item uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('count',count(r.id),'average',round(avg(r.stars),1)) from public.parts_items i left join public.parts_ratings r on r.rated_user_id=i.owner_user_id where i.id=p_item and i.email_confirmed_at is not null and i.moderation_hidden_at is null and i.status in ('available','reserved') group by i.id;
$$;
revoke all on function public.public_seller_rating(uuid) from public,anon,authenticated;
grant execute on function public.public_seller_rating(uuid) to service_role;
commit;
