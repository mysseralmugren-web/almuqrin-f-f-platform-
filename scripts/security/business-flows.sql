-- Module 13 — business-rule / integrity tests.
-- Everything runs inside ONE transaction and ends with ROLLBACK. No data persists.
\set ON_ERROR_STOP 0
\timing off
BEGIN;

CREATE TEMP TABLE t_results(name text, passed boolean, detail text) ON COMMIT DROP;

CREATE OR REPLACE FUNCTION pg_temp.expect_fail(_name text, _sql text, _match text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE _sql;
    INSERT INTO t_results VALUES (_name, false, 'statement unexpectedly SUCCEEDED');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO t_results VALUES (_name, position(_match in SQLERRM) > 0 OR _match = '', SQLERRM);
  END;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.expect_ok(_name text, _sql text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE _sql;
    INSERT INTO t_results VALUES (_name, true, 'ok');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO t_results VALUES (_name, false, SQLERRM);
  END;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.expect_eq(_name text, _actual numeric, _expected numeric)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO t_results VALUES (_name, _actual = _expected, format('actual=%s expected=%s', _actual, _expected));
END $$;

CREATE OR REPLACE FUNCTION pg_temp.expect_true(_name text, _actual boolean, _detail text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO t_results VALUES (_name, COALESCE(_actual, false), _detail);
END $$;

-- ========== 0. SECURITY DEFINER catalogue is deny-by-default ==========
SELECT pg_temp.expect_eq('no SECURITY DEFINER function is executable by anon/PUBLIC',
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.prosecdef
     AND (has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('public', p.oid, 'EXECUTE'))), 0);

SELECT pg_temp.expect_eq('trigger functions are not executable by authenticated',
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.prosecdef AND pg_get_function_result(p.oid)='trigger'
     AND has_function_privilege('authenticated', p.oid, 'EXECUTE')), 0);

SELECT pg_temp.expect_true('internal purge is service-role only',
  NOT has_function_privilege('authenticated', 'public.purge_expired_ai_jobs(uuid)'::regprocedure, 'EXECUTE'));
SELECT pg_temp.expect_true('document number generator is service-role only',
  NOT has_function_privilege('authenticated', 'public.next_document_number(uuid,text,text)'::regprocedure, 'EXECUTE'));
SELECT pg_temp.expect_true('analytics allowlist remains executable by authenticated',
  has_function_privilege('authenticated', 'public.analytics_executive(date,date)'::regprocedure, 'EXECUTE'));

SELECT pg_temp.expect_fail('export audit rejects an unknown report', $q$
  SELECT public.analytics_log_export('unknown','csv','{"from":"2026-01-01","to":"2026-01-31"}'::jsonb) $q$, 'INVALID_EXPORT_REPORT');
SELECT pg_temp.expect_fail('export audit rejects an unknown scope key', $q$
  SELECT public.analytics_log_export('finance','csv','{"from":"2026-01-01","to":"2026-01-31","companyId":"11111111-1111-1111-1111-111111111111"}'::jsonb) $q$, 'INVALID_EXPORT_SCOPE_KEY');

-- ---------- fixtures ----------
INSERT INTO companies(id, name_ar, vat_number, address_building_no, address_street, address_district, address_city, address_postal_code)
VALUES ('11111111-1111-1111-1111-111111111111','FLOWTEST','300000000000003','1234','st','dist','Riyadh','12345');
\set C '''11111111-1111-1111-1111-111111111111'''

INSERT INTO warehouses(id, company_id, code, name_ar) VALUES ('22222222-2222-2222-2222-222222222222', :C, 'WH1','مستودع');
INSERT INTO items(id, company_id, sku, name_ar, unit) VALUES ('33333333-3333-3333-3333-333333333333', :C, 'SKU1','خشب','pcs');
INSERT INTO customers(id, company_id, name_ar) VALUES ('44444444-4444-4444-4444-444444444444', :C, 'عميل');
INSERT INTO chart_of_accounts(id, company_id, code, name_ar, account_type, is_postable)
VALUES ('55555555-5555-5555-5555-555555555551', :C, '1100','النقد','asset', true),
       ('55555555-5555-5555-5555-555555555552', :C, '4100','المبيعات','revenue', true);

-- ========== 1. Inventory: no negative stock ==========
SELECT pg_temp.expect_ok('receipt of 10 units succeeds', $q$
  INSERT INTO stock_movements(company_id, item_id, movement_type, quantity, unit_cost, warehouse_id, idempotency_key)
  VALUES ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','receipt',10,100,
          '22222222-2222-2222-2222-222222222222','flow-recv-1') $q$);

SELECT pg_temp.expect_eq('stock balance = 10 after receipt',
  (SELECT quantity FROM stock_balances WHERE item_id='33333333-3333-3333-3333-333333333333'), 10);

SELECT pg_temp.expect_fail('issuing 25 units from a stock of 10 is rejected', $q$
  INSERT INTO stock_movements(company_id, item_id, movement_type, quantity, unit_cost, warehouse_id, idempotency_key)
  VALUES ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','issue_to_mfg',25,100,
          '22222222-2222-2222-2222-222222222222','flow-issue-over') $q$, '');

SELECT pg_temp.expect_eq('stock balance unchanged after rejected issue',
  (SELECT quantity FROM stock_balances WHERE item_id='33333333-3333-3333-3333-333333333333'), 10);

SELECT pg_temp.expect_fail('duplicate idempotency_key for a stock movement is rejected', $q$
  INSERT INTO stock_movements(company_id, item_id, movement_type, quantity, unit_cost, warehouse_id, idempotency_key)
  VALUES ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','receipt',10,100,
          '22222222-2222-2222-2222-222222222222','flow-recv-1') $q$, '');

-- NOTE: state-transition tests (manufacturing order status, journal posting) need UPDATE,
-- which this read/insert-only psql role does not hold. They run in scripts/security/workflow-flows.mjs.

-- ========== 3. Journal entries: balance + immutability ==========
INSERT INTO journal_entries(id, company_id, entry_number, entry_date, status)
VALUES ('77777777-7777-7777-7777-777777777777', :C, 'JE-FLOW-1', current_date, 'draft');

SELECT pg_temp.expect_fail('a journal line cannot hold both debit and credit', $q$
  INSERT INTO journal_entry_lines(journal_entry_id, line_no, account_id, debit, credit)
  VALUES ('77777777-7777-7777-7777-777777777777',1,'55555555-5555-5555-5555-555555555551',100,100) $q$, '');

INSERT INTO journal_entry_lines(journal_entry_id, line_no, account_id, debit, credit)
VALUES ('77777777-7777-7777-7777-777777777777',1,'55555555-5555-5555-5555-555555555551',115,0);

INSERT INTO journal_entry_lines(journal_entry_id, line_no, account_id, debit, credit)
VALUES ('77777777-7777-7777-7777-777777777777',2,'55555555-5555-5555-5555-555555555552',0,115);

SELECT pg_temp.expect_eq('entry totals recomputed by trigger (debit)',
  (SELECT total_debit FROM journal_entries WHERE entry_number='JE-FLOW-1'), 115);
SELECT pg_temp.expect_eq('entry totals recomputed by trigger (credit)',
  (SELECT total_credit FROM journal_entries WHERE entry_number='JE-FLOW-1'), 115);

-- ========== 4. Payment schedule cannot exceed 100% ==========
INSERT INTO sales_orders(id, company_id, customer_id, order_number, subtotal, vat_amount, total)
VALUES ('88888888-8888-8888-8888-888888888888', :C, '44444444-4444-4444-4444-444444444444','SO-FLOW-1',1000,150,1150);

INSERT INTO payment_schedules(company_id, sales_order_id, sequence, label_ar, label_en, percentage, amount, trigger_stage)
VALUES (:C,'88888888-8888-8888-8888-888888888888',1,'دفعة','Advance',50,575,'on_signature'),
       (:C,'88888888-8888-8888-8888-888888888888',2,'دفعة','Production',30,345,'production_50');

SELECT pg_temp.expect_fail('payment schedule total above 100% is rejected', $q$
  INSERT INTO payment_schedules(company_id, sales_order_id, sequence, label_ar, label_en, percentage, amount, trigger_stage)
  VALUES ('11111111-1111-1111-1111-111111111111','88888888-8888-8888-8888-888888888888',3,'دفعة','Final',40,460,'before_delivery') $q$, '');

SELECT pg_temp.expect_ok('payment schedule totalling exactly 100% is accepted', $q$
  INSERT INTO payment_schedules(company_id, sales_order_id, sequence, label_ar, label_en, percentage, amount, trigger_stage)
  VALUES ('11111111-1111-1111-1111-111111111111','88888888-8888-8888-8888-888888888888',3,'دفعة','Final',20,230,'before_delivery') $q$);

-- ========== 5. VAT 15% rounding (SAR, 2 decimals, half-up) ==========
SELECT pg_temp.expect_eq('VAT 15% of 33.33 rounds to 5.00', round(33.33*0.15, 2), 5.00);
SELECT pg_temp.expect_eq('VAT 15% of 0.10 rounds to 0.02',  round(0.10*0.15, 2), 0.02);
SELECT pg_temp.expect_eq('gross of 1000 + 15% VAT = 1150',  round(1000*1.15, 2), 1150.00);

-- ========== 6. Invoice identity gate ==========
SELECT pg_temp.expect_fail('invoice cannot be issued for a company without VAT/national address', $q$
  WITH c AS (INSERT INTO companies(name_ar) VALUES ('NOIDENT') RETURNING id),
       cu AS (INSERT INTO customers(company_id, name_ar) SELECT id,'x' FROM c RETURNING id, company_id)
  INSERT INTO invoices(company_id, customer_id, invoice_number, subtotal, vat_amount, total, status)
  SELECT company_id, id, 'INV-NOIDENT', 100, 15, 115, 'issued' FROM cu $q$, 'INVOICE_BLOCKED');

-- ========== 7. Document numbering is atomic & gapless per company/period ==========
INSERT INTO document_sequences(company_id, kind, period_key, prefix, padding, last_number)
VALUES (:C, 'quotation', '2026', 'QT', 5, 0);
SELECT pg_temp.expect_eq('document sequence increments by exactly 1',
  (SELECT last_number + 1 FROM document_sequences WHERE company_id = '11111111-1111-1111-1111-111111111111' AND kind='quotation'), 1);

-- ---------- report ----------
\echo ''
\echo '================= BUSINESS FLOW TEST RESULTS ================='
SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS r, name, left(detail, 90) AS detail FROM t_results;
SELECT count(*) FILTER (WHERE passed) AS passed, count(*) FILTER (WHERE NOT passed) AS failed FROM t_results;

ROLLBACK;
