begin;
create function public.search_public_items(p_filters jsonb,p_cursor jsonb default null) returns setof jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('id',i.id,'title',i.title,'description',i.description,'category',i.category,'condition',i.condition,'offer_type',i.offer_type,'price_chf',i.price_chf,'photos',i.photos,'fits',i.fits,'fits_note',i.fits_note,'manufacturer',i.manufacturer,'oem_number',i.oem_number,'pickup_zip',i.pickup_zip,'pickup_canton',i.pickup_canton,'shipping_possible',i.shipping_possible,'negotiable',i.negotiable,'swap_for',i.swap_for,'status',i.status,'created_at',i.created_at,'owner_name',i.owner_name,'owner_type',i.owner_type,'payment_mode',i.payment_mode,'tire_width',i.tire_width,'tire_ratio',i.tire_ratio,'rim_diameter',i.rim_diameter,'tire_season',i.tire_season,'tread_mm',i.tread_mm,'rim_bolt_pattern',i.rim_bolt_pattern,'rim_offset_et',i.rim_offset_et,'quantity',i.quantity,'businesses',case when b.id is not null then jsonb_build_object('name',b.name,'slug',b.slug) else null end)
 from public.parts_items i left join public.businesses b on b.id=i.business_id
 where i.status in ('available','reserved') and i.email_confirmed_at is not null and i.moderation_hidden_at is null
 and (p_filters->>'q' is null or i.search_tsv @@ websearch_to_tsquery('german',p_filters->>'q'))
 and (p_filters->>'category' is null or i.category::text=p_filters->>'category')
 and (p_filters->>'condition' is null or i.condition::text=p_filters->>'condition')
 and (p_filters->>'offer' is null or i.offer_type::text=p_filters->>'offer')
 and (p_filters->>'canton' is null or i.pickup_canton=p_filters->>'canton')
 and (p_filters->>'zip' is null or i.pickup_zip=p_filters->>'zip')
 and (p_filters->>'shipping' is null or i.shipping_possible)
 and (p_filters->>'seller' is null or case when p_filters->>'seller'='business' then i.owner_type='business' else i.owner_type in ('guest','private') end)
 and (p_filters->>'min' is null or i.price_chf >= (p_filters->>'min')::numeric)
 and (p_filters->>'max' is null or i.price_chf <= (p_filters->>'max')::numeric)
 and (p_filters->>'width' is null or i.tire_width=(p_filters->>'width')::int)
 and (p_filters->>'ratio' is null or i.tire_ratio=(p_filters->>'ratio')::int)
 and (p_filters->>'diameter' is null or i.rim_diameter=(p_filters->>'diameter')::numeric)
 and (p_filters->>'season' is null or i.tire_season=p_filters->>'season')
 and (p_filters->>'bolt' is null or i.rim_bolt_pattern=p_filters->>'bolt')
 and exists(select 1 from jsonb_array_elements(i.fits) f where (p_filters->>'make' is null or lower(f->>'make')=lower(p_filters->>'make')) and (p_filters->>'model' is null or lower(f->>'model')=lower(p_filters->>'model')) and (p_filters->>'year' is null or (f->>'year_from')::int <= (p_filters->>'year')::int and (f->>'year_to')::int >= (p_filters->>'year')::int))
 and (p_cursor is null or (i.created_at,i.id)<((p_cursor->>'date')::timestamptz,(p_cursor->>'id')::uuid))
 order by i.created_at desc,i.id desc limit 25;
$$;
revoke all on function public.search_public_items(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.search_public_items(jsonb,jsonb) to service_role;
commit;
