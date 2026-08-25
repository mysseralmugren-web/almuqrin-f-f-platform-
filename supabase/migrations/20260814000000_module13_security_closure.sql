-- Module 13 security closure
-- Restored from the verified staging database state on 2026-08-25.
-- This migration intentionally keeps tenant authorization in SQL/RLS and preserves
-- the server-only boundaries used by the application.

BEGIN;

-- -----------------------------------------------------------------------------
-- Active tenant resolution and profile / role integrity
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT p.company_id
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.guard_profile_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'TENANT_CHANGE_FORBIDDEN';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    IF OLD.id = auth.uid() THEN
      RAISE EXCEPTION 'SELF_ACTIVATION_CHANGE_FORBIDDEN';
    END IF;
    IF OLD.company_id IS DISTINCT FROM public.current_company_id()
       OR NOT public.is_company_admin() THEN
      RAISE EXCEPTION 'PROFILE_ACTIVATION_FORBIDDEN';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_company ON public.profiles;
CREATE TRIGGER trg_guard_profile_company
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_company();

-- Backfill any legacy role rows before making every role tenant-bound.
UPDATE public.user_roles ur
SET company_id = p.company_id
FROM public.profiles p
WHERE ur.user_id = p.id
  AND ur.company_id IS NULL
  AND p.company_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_user_role_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  profile_company uuid;
BEGIN
  SELECT p.company_id INTO profile_company
  FROM public.profiles p
  WHERE p.id = NEW.user_id;
  IF profile_company IS NULL THEN RAISE EXCEPTION 'ROLE_PROFILE_COMPANY_REQUIRED'; END IF;
  IF NEW.company_id IS NULL THEN NEW.company_id := profile_company; END IF;
  IF NEW.company_id IS DISTINCT FROM profile_company THEN RAISE EXCEPTION 'ROLE_COMPANY_MISMATCH'; END IF;
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'ROLE_USER_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_role_company ON public.user_roles;
CREATE TRIGGER trg_guard_user_role_company
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_user_role_company();

DROP POLICY IF EXISTS "read company roles" ON public.user_roles;
CREATE POLICY "read company roles" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (company_id = public.current_company_id() AND public.is_company_admin())
);

-- -----------------------------------------------------------------------------
-- Per-document-kind authorization and immutable reviewed/issued content
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_document_kind(_kind public.doc_template_kind, _approver boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT CASE
    WHEN public.is_company_admin() THEN true
    WHEN _approver THEN CASE _kind
      WHEN 'quotation' THEN public.has_any_role(ARRAY['sales_manager'])
      WHEN 'sales_order' THEN public.has_any_role(ARRAY['sales_manager'])
      WHEN 'supply_contract' THEN public.has_any_role(ARRAY['sales_manager'])
      WHEN 'tax_invoice' THEN public.has_any_role(ARRAY['accountant'])
      WHEN 'receipt_voucher' THEN public.has_any_role(ARRAY['accountant'])
      WHEN 'payment_voucher' THEN public.has_any_role(ARRAY['accountant'])
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
      WHEN 'receipt_voucher' THEN public.has_any_role(ARRAY['accountant'])
      WHEN 'payment_voucher' THEN public.has_any_role(ARRAY['accountant'])
      WHEN 'manufacturing_order' THEN public.has_any_role(ARRAY['production_manager'])
      WHEN 'goods_receipt' THEN public.has_any_role(ARRAY['warehouse_manager','purchasing_manager'])
      WHEN 'delivery_note' THEN public.has_any_role(ARRAY['warehouse_manager','project_manager','sales_manager'])
      WHEN 'measurement_report' THEN public.has_any_role(ARRAY['project_manager','designer'])
      WHEN 'design_approval' THEN public.has_any_role(ARRAY['project_manager','designer'])
      WHEN 'final_handover' THEN public.has_any_role(ARRAY['project_manager'])
      WHEN 'employee_contract' THEN public.has_any_role(ARRAY['hr'])
      ELSE false END
  END;
$$;

DROP POLICY IF EXISTS "generated read" ON public.generated_documents;
CREATE POLICY "generated read" ON public.generated_documents
FOR SELECT TO authenticated
USING (
  company_id = public.current_company_id()
  AND public.can_access_document_kind(kind, false)
  AND NOT public.is_portal_customer()
);

CREATE OR REPLACE FUNCTION public.guard_generated_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  allowed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN RAISE EXCEPTION 'DOC_MUST_START_DRAFT'; END IF;
    IF NEW.doc_number IS NOT NULL THEN RAISE EXCEPTION 'DOC_NUMBER_ON_ISSUE_ONLY'; END IF;
    IF auth.uid() IS NOT NULL THEN
      IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
      IF NEW.created_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'DOC_ACTOR_MISMATCH'; END IF;
      IF NOT public.can_access_document_kind(NEW.kind, false) THEN RAISE EXCEPTION 'FORBIDDEN_KIND'; END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.entity IS DISTINCT FROM OLD.entity
     OR NEW.entity_id IS DISTINCT FROM OLD.entity_id
     OR NEW.verify_token IS DISTINCT FROM OLD.verify_token
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'DOC_IDENTITY_IMMUTABLE';
  END IF;

  IF OLD.status IN ('review','approved') AND (
    NEW.snapshot IS DISTINCT FROM OLD.snapshot
    OR NEW.qr_payload IS DISTINCT FROM OLD.qr_payload
    OR NEW.template_id IS DISTINCT FROM OLD.template_id
    OR NEW.template_version IS DISTINCT FROM OLD.template_version
    OR NEW.revision IS DISTINCT FROM OLD.revision
    OR NEW.revision_of IS DISTINCT FROM OLD.revision_of
  ) THEN
    RAISE EXCEPTION 'DOC_REVIEW_CONTENT_LOCKED';
  END IF;

  IF OLD.status IN ('issued','void') AND (
    NEW.snapshot IS DISTINCT FROM OLD.snapshot
    OR NEW.qr_payload IS DISTINCT FROM OLD.qr_payload
    OR NEW.doc_number IS DISTINCT FROM OLD.doc_number
    OR NEW.template_id IS DISTINCT FROM OLD.template_id
    OR NEW.template_version IS DISTINCT FROM OLD.template_version
    OR NEW.revision IS DISTINCT FROM OLD.revision
    OR NEW.revision_of IS DISTINCT FROM OLD.revision_of
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
  ) THEN
    RAISE EXCEPTION 'DOC_IMMUTABLE_AFTER_ISSUE';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    allowed :=
      (OLD.status = 'draft' AND NEW.status IN ('review','void'))
      OR (OLD.status = 'review' AND NEW.status IN ('draft','approved','void'))
      OR (OLD.status = 'approved' AND NEW.status IN ('issued','draft','void'))
      OR (OLD.status = 'issued' AND NEW.status = 'void');
    IF NOT allowed THEN RAISE EXCEPTION 'DOC_INVALID_TRANSITION'; END IF;
    IF auth.uid() IS NOT NULL
       AND NEW.status <> 'review'
       AND NOT public.can_access_document_kind(NEW.kind, true) THEN
      RAISE EXCEPTION 'DOC_APPROVER_REQUIRED';
    END IF;
    IF NEW.status = 'issued' THEN
      IF OLD.status <> 'approved' THEN RAISE EXCEPTION 'DOC_NOT_APPROVED'; END IF;
      IF NEW.doc_number IS NULL THEN RAISE EXCEPTION 'DOC_NUMBER_REQUIRED'; END IF;
      IF auth.uid() IS NOT NULL AND NEW.issued_by IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'DOC_ISSUER_MISMATCH';
      END IF;
      NEW.issued_at := COALESCE(NEW.issued_at, now());
    END IF;
    IF NEW.status = 'void' AND COALESCE(btrim(NEW.void_reason), '') = '' THEN
      RAISE EXCEPTION 'DOC_VOID_REASON_REQUIRED';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_generated_document ON public.generated_documents;
CREATE TRIGGER trg_guard_generated_document
BEFORE INSERT OR UPDATE ON public.generated_documents
FOR EACH ROW EXECUTE FUNCTION public.guard_generated_document();

-- -----------------------------------------------------------------------------
-- Identity, official records and template approval locks
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_identity_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL AND (
      NEW.status <> 'draft' OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'IDENTITY_MUST_START_DRAFT';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN RAISE EXCEPTION 'TENANT_CHANGE_FORBIDDEN'; END IF;
  IF OLD.status = 'approved' AND NEW.status = 'approved' THEN
    RAISE EXCEPTION 'IDENTITY_APPROVAL_LOCKED';
  END IF;
  IF OLD.status = 'approved' AND NEW.status <> 'approved'
     AND auth.uid() IS NOT NULL AND NOT public.is_company_admin() THEN
    RAISE EXCEPTION 'IDENTITY_APPROVER_REQUIRED';
  END IF;
  IF NEW.status = 'approved' THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_company_admin() THEN
      RAISE EXCEPTION 'IDENTITY_APPROVER_REQUIRED';
    END IF;
    IF auth.uid() IS NOT NULL AND NEW.reviewed_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'IDENTITY_REVIEWER_MISMATCH';
    END IF;
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
  ELSE
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_identity_review ON public.company_identity;
CREATE TRIGGER trg_guard_identity_review
BEFORE INSERT OR UPDATE ON public.company_identity
FOR EACH ROW EXECUTE FUNCTION public.guard_identity_review();

CREATE OR REPLACE FUNCTION public.guard_company_document_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      IF NEW.status <> 'draft' THEN RAISE EXCEPTION 'COMPANY_DOC_MUST_START_DRAFT'; END IF;
      IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
      IF NEW.created_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'COMPANY_DOC_ACTOR_MISMATCH'; END IF;
      IF NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL THEN
        RAISE EXCEPTION 'COMPANY_DOC_REVIEW_METADATA_FORBIDDEN';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'COMPANY_DOC_IDENTITY_IMMUTABLE';
  END IF;
  IF OLD.status IN ('approved','rejected') AND NEW.status = OLD.status THEN
    RAISE EXCEPTION 'COMPANY_DOC_APPROVAL_LOCKED';
  END IF;
  IF OLD.status IN ('approved','rejected') AND NEW.status <> OLD.status
     AND auth.uid() IS NOT NULL AND NOT public.is_company_admin() THEN
    RAISE EXCEPTION 'COMPANY_DOC_APPROVER_REQUIRED';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_company_admin() THEN
      RAISE EXCEPTION 'COMPANY_DOC_APPROVER_REQUIRED';
    END IF;
    IF auth.uid() IS NOT NULL AND NEW.reviewed_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'COMPANY_DOC_REVIEWER_MISMATCH';
    END IF;
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_company_document_review ON public.company_documents;
CREATE TRIGGER trg_guard_company_document_review
BEFORE INSERT OR UPDATE ON public.company_documents
FOR EACH ROW EXECUTE FUNCTION public.guard_company_document_review();

CREATE OR REPLACE FUNCTION public.guard_template_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_published THEN
    IF NEW.layout IS DISTINCT FROM OLD.layout
       OR NEW.terms_ar IS DISTINCT FROM OLD.terms_ar
       OR NEW.footer_ar IS DISTINCT FROM OLD.footer_ar
       OR NEW.watermark_text IS DISTINCT FROM OLD.watermark_text
       OR NEW.show_qr IS DISTINCT FROM OLD.show_qr
       OR NEW.show_logo IS DISTINCT FROM OLD.show_logo
       OR NEW.version IS DISTINCT FROM OLD.version
       OR NEW.is_published = false
       OR NEW.published_by IS DISTINCT FROM OLD.published_by
       OR NEW.published_at IS DISTINCT FROM OLD.published_at THEN
      RAISE EXCEPTION 'TEMPLATE_VERSION_LOCKED';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.is_published AND NOT OLD.is_published THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_company_admin() THEN
      RAISE EXCEPTION 'TEMPLATE_PUBLISHER_REQUIRED';
    END IF;
    IF auth.uid() IS NOT NULL AND NEW.published_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'TEMPLATE_PUBLISHER_MISMATCH';
    END IF;
    NEW.published_at := now();
    UPDATE public.document_templates
      SET current_version = NEW.version
      WHERE id = NEW.template_id
        AND company_id = NEW.company_id
        AND current_version < NEW.version;
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Payment approval ceilings and finance data visibility
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_payment_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  inv record;
  committed numeric;
  transition_allowed boolean;
  can_operate boolean;
  can_approve boolean;
  can_execute boolean;
BEGIN
  SELECT id, company_id, supplier_id, total, status INTO inv
  FROM public.supplier_invoices WHERE id = NEW.supplier_invoice_id;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'SUPPLIER_INVOICE_NOT_FOUND'; END IF;
  IF inv.company_id IS DISTINCT FROM NEW.company_id OR inv.supplier_id IS DISTINCT FROM NEW.supplier_id THEN
    RAISE EXCEPTION 'PAYMENT_REFERENCE_OUTSIDE_COMPANY';
  END IF;
  SELECT COALESCE(sum(pr.amount), 0) INTO committed
  FROM public.payment_requests pr
  WHERE pr.supplier_invoice_id = NEW.supplier_invoice_id
    AND pr.status IN ('submitted','approved','executed')
    AND pr.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  IF NEW.status IN ('submitted','approved','executed') AND committed + NEW.amount > inv.total + 0.01 THEN
    RAISE EXCEPTION 'PAYMENT_EXCEEDS_INVOICE_TOTAL';
  END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  can_operate := public.has_any_role(ARRAY['super_admin','factory_owner','general_manager','accountant','purchasing_manager']);
  can_execute := public.has_any_role(ARRAY['super_admin','factory_owner','general_manager','accountant']);
  can_approve :=
    public.has_any_role(ARRAY['super_admin','factory_owner'])
    OR (NEW.amount <= 250000 AND public.has_any_role(ARRAY['general_manager']))
    OR (NEW.amount <= 50000 AND public.has_any_role(ARRAY['purchasing_manager']));
  IF TG_OP = 'INSERT' THEN
    IF NOT can_operate THEN RAISE EXCEPTION 'PAYMENT_ROLE_REQUIRED'; END IF;
    IF NEW.status <> 'draft' THEN RAISE EXCEPTION 'PAYMENT_MUST_START_DRAFT'; END IF;
    IF NEW.requested_by IS NULL THEN NEW.requested_by := auth.uid(); END IF;
    IF NEW.requested_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'PAYMENT_REQUESTER_MISMATCH'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    transition_allowed :=
      (OLD.status = 'draft' AND NEW.status IN ('submitted','cancelled'))
      OR (OLD.status = 'submitted' AND NEW.status IN ('approved','rejected','cancelled'))
      OR (OLD.status = 'approved' AND NEW.status IN ('executed','cancelled'));
    IF NOT transition_allowed THEN RAISE EXCEPTION 'PAYMENT_INVALID_TRANSITION'; END IF;
    IF NEW.status = 'approved' AND NOT can_approve THEN RAISE EXCEPTION 'PAYMENT_APPROVAL_LIMIT_EXCEEDED'; END IF;
    IF NEW.status = 'executed' AND NOT can_execute THEN RAISE EXCEPTION 'PAYMENT_EXECUTOR_REQUIRED'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "ba_read" ON public.bank_accounts;
CREATE POLICY "ba_read" ON public.bank_accounts
FOR SELECT TO authenticated
USING (
  company_id = public.current_company_id()
  AND public.has_any_role(ARRAY['super_admin','factory_owner','general_manager','accountant'])
);

-- -----------------------------------------------------------------------------
-- Storage separation: generic uploads must never enter the HR folder
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "attachments_insert_own_company" ON storage.objects;
CREATE POLICY "attachments_insert_own_company" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'mfg-attachments'
  AND (storage.foldername(name))[1] = public.current_company_id()::text
  AND COALESCE((storage.foldername(name))[2], '') <> 'hr'
);

-- -----------------------------------------------------------------------------
-- AI authorization and server-only file registration
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_ai_kind(_kind public.ai_job_kind)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT CASE
    WHEN public.current_company_id() IS NULL OR public.is_portal_customer() THEN false
    WHEN COALESCE((
      SELECT s.admin_kinds_only
      FROM public.ai_provider_settings s
      WHERE s.company_id = public.current_company_id()
    ), false) AND NOT public.is_company_admin() THEN false
    WHEN public.is_company_admin() THEN true
    WHEN _kind IN ('supplier_invoice','expense') THEN public.has_any_role(ARRAY['accountant'])
    WHEN _kind IN ('quotation','sales_order') THEN public.has_any_role(ARRAY['sales_manager','sales_employee'])
    WHEN _kind = 'employee_contract' THEN public.has_any_role(ARRAY['hr'])
    WHEN _kind IN ('furniture_design','drawing_measurements','seating_capacity','design_skill') THEN
      public.has_any_role(ARRAY['production_manager','designer','project_manager','quality_manager','technician'])
    WHEN _kind = 'general_document' THEN true
    ELSE false
  END;
$$;

REVOKE INSERT ON public.ai_job_files FROM authenticated;

-- -----------------------------------------------------------------------------
-- Cross-tenant quotation/customer protection
-- -----------------------------------------------------------------------------
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_customer_company_fk;
ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_customer_company_fk
  FOREIGN KEY (company_id, customer_id)
  REFERENCES public.customers(company_id, id)
  NOT VALID;

-- -----------------------------------------------------------------------------
-- Atomic WhatsApp unread counter
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_wa_unread(_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED'; END IF;
  UPDATE public.wa_conversations
  SET unread_count = unread_count + 1,
      last_message_at = now(),
      window_expires_at = now() + interval '24 hours'
  WHERE id = _conversation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONVERSATION_NOT_FOUND'; END IF;
END;
$$;

COMMIT;
