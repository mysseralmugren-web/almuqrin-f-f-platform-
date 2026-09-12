create unique index if not exists ux_sales_orders_quotation_id
  on public.sales_orders(quotation_id) where quotation_id is not null;
create unique index if not exists ux_production_orders_sales_order_id
  on public.production_orders(sales_order_id) where sales_order_id is not null;

create or replace function public.workflow_convert_quotation_to_order(
  p_quotation_id uuid,
  p_delivery_date date default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_company uuid;
  v_quote public.quotations%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_total numeric;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  select company_id into v_company from public.profiles where id=v_user and is_active=true;
  if v_company is null then raise exception 'NO_ACTIVE_COMPANY'; end if;
  if not public.has_any_role(array['super_admin','factory_owner','general_manager','sales_manager','sales_employee']) then
    raise exception 'FORBIDDEN_ROLE';
  end if;

  select * into v_quote from public.quotations
  where id=p_quotation_id and company_id=v_company
  for update;
  if not found then raise exception 'QUOTATION_NOT_FOUND'; end if;
  if v_quote.status <> 'accepted'::public.quote_status then raise exception 'QUOTATION_NOT_ACCEPTED'; end if;
  if exists(select 1 from public.sales_orders where quotation_id=v_quote.id) then raise exception 'ORDER_ALREADY_EXISTS'; end if;

  v_order_number := public.next_document_number(v_company,'sales_order','SO');
  insert into public.sales_orders(company_id,customer_id,quotation_id,order_number,status,delivery_date,subtotal,discount_total,vat_amount,total,created_by)
  values(v_company,v_quote.customer_id,v_quote.id,v_order_number,'confirmed'::public.order_status,p_delivery_date,v_quote.subtotal,v_quote.discount_total,v_quote.vat_amount,v_quote.total,v_user)
  returning id into v_order_id;

  insert into public.sales_order_items(sales_order_id,description,unit,quantity,unit_price,discount_percent,discount_amount,taxable_amount,vat_rate,vat_amount,line_total)
  select v_order_id,description,unit,quantity,unit_price,discount_percent,discount_amount,taxable_amount,vat_rate,vat_amount,line_total
  from public.quotation_items where quotation_id=v_quote.id;

  v_total := v_quote.total;
  insert into public.payment_schedules(company_id,sales_order_id,sequence,label_ar,label_en,percentage,amount,trigger_stage,created_by)
  values
    (v_company,v_order_id,1,'دفعة عند التوقيع','On signature',50,round(v_total*0.50,2),'on_signature',v_user),
    (v_company,v_order_id,2,'دفعة عند إنجاز 50% من التصنيع','At 50% production',30,round(v_total*0.30,2),'production_50',v_user),
    (v_company,v_order_id,3,'دفعة قبل/عند التسليم','Before delivery',20,round(v_total*0.20,2),'before_delivery',v_user);

  return jsonb_build_object('id',v_order_id,'order_number',v_order_number);
end;
$$;

revoke all on function public.workflow_convert_quotation_to_order(uuid,date) from public, anon;
grant execute on function public.workflow_convert_quotation_to_order(uuid,date) to authenticated;

create or replace function public.workflow_create_production_order(
  p_sales_order_id uuid,
  p_due_date date default null,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_company uuid;
  v_po_id uuid;
  v_po_number text;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  select company_id into v_company from public.profiles where id=v_user and is_active=true;
  if v_company is null then raise exception 'NO_ACTIVE_COMPANY'; end if;
  if not public.has_any_role(array['super_admin','factory_owner','general_manager','production_manager','quality_manager']) then
    raise exception 'FORBIDDEN_ROLE';
  end if;
  if not exists(select 1 from public.sales_orders where id=p_sales_order_id and company_id=v_company) then raise exception 'ORDER_NOT_FOUND'; end if;
  if exists(select 1 from public.production_orders where sales_order_id=p_sales_order_id) then raise exception 'PRODUCTION_ORDER_ALREADY_EXISTS'; end if;

  v_po_number := public.next_document_number(v_company,'production_order','PO');
  insert into public.production_orders(company_id,sales_order_id,po_number,status,start_date,due_date,notes,created_by)
  values(v_company,p_sales_order_id,v_po_number,'planned'::public.production_status,current_date,p_due_date,nullif(btrim(p_notes),''),v_user)
  returning id into v_po_id;

  insert into public.production_stages(production_order_id,sequence,name_ar,name_en)
  values
    (v_po_id,1,'التجهيز والقص','Cutting & preparation'),
    (v_po_id,2,'التجميع','Assembly'),
    (v_po_id,3,'الدهان والتشطيب','Finishing'),
    (v_po_id,4,'فحص الجودة النهائي','Final quality check');

  update public.sales_orders set status='in_production'::public.order_status where id=p_sales_order_id and company_id=v_company;
  return jsonb_build_object('id',v_po_id,'po_number',v_po_number);
end;
$$;

revoke all on function public.workflow_create_production_order(uuid,date,text) from public, anon;
grant execute on function public.workflow_create_production_order(uuid,date,text) to authenticated;
