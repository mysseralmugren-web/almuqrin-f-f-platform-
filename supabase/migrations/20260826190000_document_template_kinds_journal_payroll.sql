ALTER TYPE public.doc_template_kind ADD VALUE IF NOT EXISTS 'journal_entry';
ALTER TYPE public.doc_template_kind ADD VALUE IF NOT EXISTS 'payroll_register';

CREATE OR REPLACE FUNCTION public.can_access_document_kind(_kind public.doc_template_kind, _approver boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT CASE
    WHEN public.is_company_admin() THEN true
    WHEN _approver THEN CASE _kind
      WHEN 'quotation' THEN public.has_any_role(ARRAY['sales_manager'])
      WHEN 'sales_order' THEN public.has_any_role(ARRAY['sales_manager'])
      WHEN 'supply_contract' THEN public.has_any_role(ARRAY['sales_manager'])
      WHEN 'tax_invoice' THEN public.has_any_role(ARRAY['accountant'])
      WHEN 'purchase_invoice' THEN public.has_any_role(ARRAY['accountant','purchasing_manager'])
      WHEN 'receipt_voucher' THEN public.has_any_role(ARRAY['accountant'])
      WHEN 'payment_voucher' THEN public.has_any_role(ARRAY['accountant'])
      WHEN 'journal_entry' THEN public.has_any_role(ARRAY['accountant'])
      WHEN 'payroll_register' THEN public.has_any_role(ARRAY['hr','accountant'])
      WHEN 'manufacturing_order' THEN public.has_any_role(ARRAY['production_manager'])
      WHEN 'goods_receipt' THEN public.has_any_role(ARRAY['warehouse_manager','purchasing_manager'])
      WHEN 'delivery_note' THEN public.has_any_role(ARRAY['warehouse_manager','project_manager'])
      WHEN 'measurement_report' THEN public.has_any_role(ARRAY['project_manager'])
      WHEN 'design_approval' THEN public.has_any_role(ARRAY['project_manager'])
      WHEN 'final_handover' THEN public.has_any_role(ARRAY['project_manager'])
      WHEN 'employee_contract' THEN public.has_any_role(ARRAY['hr'])
      ELSE false END
    ELSE CASE _kind
      WHEN 'quotation' THEN public.has_any_role(ARRAY['sales_manager','sales_employee'])
      WHEN 'sales_order' THEN public.has_any_role(ARRAY['sales_manager','sales_employee'])
      WHEN 'supply_contract' THEN public.has_any_role(ARRAY['sales_manager'])
      WHEN 'tax_invoice' THEN public.has_any_role(ARRAY['accountant'])
      WHEN 'purchase_invoice' THEN public.has_any_role(ARRAY['accountant','purchasing_manager'])
      WHEN 'receipt_voucher' THEN public.has_any_role(ARRAY['accountant'])
      WHEN 'payment_voucher' THEN public.has_any_role(ARRAY['accountant'])
      WHEN 'journal_entry' THEN public.has_any_role(ARRAY['accountant'])
      WHEN 'payroll_register' THEN public.has_any_role(ARRAY['hr','accountant'])
      WHEN 'manufacturing_order' THEN public.has_any_role(ARRAY['production_manager'])
      WHEN 'goods_receipt' THEN public.has_any_role(ARRAY['warehouse_manager','purchasing_manager'])
      WHEN 'delivery_note' THEN public.has_any_role(ARRAY['warehouse_manager','project_manager','sales_manager'])
      WHEN 'measurement_report' THEN public.has_any_role(ARRAY['project_manager','designer'])
      WHEN 'design_approval' THEN public.has_any_role(ARRAY['project_manager','designer'])
      WHEN 'final_handover' THEN public.has_any_role(ARRAY['project_manager'])
      WHEN 'employee_contract' THEN public.has_any_role(ARRAY['hr'])
      ELSE false END
  END;
$function$;
