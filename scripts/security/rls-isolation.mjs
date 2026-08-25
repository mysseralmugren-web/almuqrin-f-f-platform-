/**
 * Multi-tenant RLS / isolation test harness (Module 13).
 * Creates two throwaway companies + four throwaway auth users, runs assertions
 * over PostgREST with real JWTs (anon / authenticated / different roles),
 * then deletes everything it created. No permanent test data remains.
 *
 * Run: bun scripts/security/rls-isolation.mjs
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SERVICE) throw new Error('missing supabase env');

const kf = (key) => (input, init) => {
  const h = new Headers(init?.headers);
  if (key.startsWith('sb_') && h.get('Authorization') === `Bearer ${key}`) h.delete('Authorization');
  h.set('apikey', key);
  return fetch(input, { ...init, headers: h });
};
const admin = createClient(URL, SERVICE, { auth: { persistSession: false }, global: { fetch: kf(SERVICE) } });
// Pristine anon client — never signs in, so it always speaks as role `anon`.
const anonClient = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: kf(ANON) } });
// Separate throwaway client used only to mint sessions (keeps anonClient pristine).
const signInClient = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: kf(ANON) } });
const asUser = (token) =>
  createClient(URL, ANON, {
    auth: { persistSession: false },
    global: { fetch: kf(ANON), headers: { Authorization: `Bearer ${token}` } },
  });

let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail = '') {
  ok ? pass++ : fail++;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
}

const created = { users: [], companies: [] };
const tag = `rls-test-${Date.now()}`;

async function mkUser(email, password) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  created.users.push(data.user.id);
  const { data: s, error: se } = await signInClient().auth.signInWithPassword({ email, password });
  if (se) throw se;
  return { id: data.user.id, token: s.session.access_token };
}

async function main() {
  // ---------- setup (service role) ----------
  const identity = {
    vat_number: '300000000000003', address_building_no: '1234', address_street: 'شارع الاختبار',
    address_district: 'حي الاختبار', address_city: 'الرياض', address_postal_code: '12345',
  };
  const { data: comps, error: ce } = await admin.from('companies')
    .insert([{ name_ar: `${tag}-A`, ...identity }, { name_ar: `${tag}-B`, ...identity }]).select('id, name_ar');
  if (ce) throw ce;
  const A = comps.find((c) => c.name_ar.endsWith('-A')).id;
  const B = comps.find((c) => c.name_ar.endsWith('-B')).id;
  created.companies.push(A, B);

  const pw = 'Test!' + Math.random().toString(36).slice(2, 12);
  const a1 = await mkUser(`${tag}-a1@example.invalid`, pw);   // company A, accountant
  const a2 = await mkUser(`${tag}-a2@example.invalid`, pw);   // company A, technician
  const a3 = await mkUser(`${tag}-a3@example.invalid`, pw);   // company A, general_manager
  const b1 = await mkUser(`${tag}-b1@example.invalid`, pw);   // company B, factory_owner

  await admin.from('profiles').upsert([
    { id: a1.id, company_id: A, full_name: 'A1', email: `${tag}-a1@example.invalid` },
    { id: a2.id, company_id: A, full_name: 'A2', email: `${tag}-a2@example.invalid` },
    { id: a3.id, company_id: A, full_name: 'A3', email: `${tag}-a3@example.invalid` },
    { id: b1.id, company_id: B, full_name: 'B1', email: `${tag}-b1@example.invalid` },
  ]);
  await admin.from('user_roles').insert([
    { user_id: a1.id, role: 'accountant' },
    { user_id: a2.id, role: 'technician' },
    { user_id: a3.id, role: 'general_manager' },
    { user_id: b1.id, role: 'factory_owner' },
  ]);

  const { data: custs, error: cue } = await admin.from('customers').insert([
    { company_id: A, name_ar: `${tag}-custA`, email: 'a@x.invalid', phone: '+966500000001' },
    { company_id: B, name_ar: `${tag}-custB`, email: 'b@x.invalid', phone: '+966500000002' },
  ]).select('id, company_id');
  if (cue) throw cue;
  const custA = custs.find((c) => c.company_id === A).id;
  const custB = custs.find((c) => c.company_id === B).id;

  const { data: emps } = await admin.from('employees').insert([
    { company_id: A, employee_number: `${tag}-E1`, full_name_ar: 'موظف', join_date: '2025-01-01' },
  ]).select('id');
  const empA = emps?.[0]?.id;
  if (empA) await admin.from('employee_sensitive').insert({ employee_id: empA, company_id: A, iban: 'SA0000000000000000000000' });

  const { data: bankA, error: bankError } = await admin.from('bank_accounts').insert({
    company_id: A, name: `${tag}-bank`, bank_name: 'Test Bank', iban: 'SA0000000000000000000000',
  }).select('id').single();
  if (bankError) throw bankError;
  const { data: journalA, error: journalError } = await admin.from('journal_entries').insert({
    company_id: A, entry_number: `${tag}-JE-sensitive`, entry_date: '2026-06-01', status: 'draft',
  }).select('id').single();
  if (journalError) throw journalError;
  const { data: voucherA, error: voucherError } = await admin.from('cash_vouchers').insert({
    company_id: A, voucher_number: `${tag}-CV`, voucher_type: 'payment', amount: 100,
    bank_account_id: bankA.id, status: 'draft',
  }).select('id').single();
  if (voucherError) throw voucherError;
  const { data: statementA, error: statementError } = await admin.from('bank_statement_lines').insert({
    company_id: A, bank_account_id: bankA.id, txn_date: '2026-06-01', amount: -100,
    description: 'sensitive test row',
  }).select('id').single();
  if (statementError) throw statementError;

  const cA1 = asUser(a1.token), cA2 = asUser(a2.token), cA3 = asUser(a3.token), cB1 = asUser(b1.token);

  // ---------- 1. anon has no data access ----------
  for (const t of ['customers', 'invoices', 'employees', 'employee_sensitive', 'projects', 'quotations', 'journal_entries', 'payroll_items', 'user_roles']) {
    const { data, error } = await anonClient.from(t).select('id').limit(5);
    check(`anon cannot read ${t}`, !!error || (data?.length ?? 0) === 0, error ? error.code : `${data?.length} rows`);
  }
  {
    const { error } = await anonClient.from('customers').insert({ company_id: A, name_ar: 'anon-hack' });
    check('anon cannot insert customers', !!error, error?.code);
  }

  // ---------- 2. tenant isolation on reads ----------
  {
    const { data } = await cA1.from('customers').select('id, company_id');
    check('A1 sees only company A customers', (data ?? []).every((r) => r.company_id === A) && data.some((r) => r.id === custA), `${data?.length} rows`);
    const { data: d2 } = await cB1.from('customers').select('id, company_id');
    check('B1 sees only company B customers', (d2 ?? []).every((r) => r.company_id === B), `${d2?.length} rows`);
  }
  // ---------- 3. IDOR by primary key ----------
  {
    const { data } = await cA1.from('customers').select('id').eq('id', custB);
    check('A1 cannot fetch company B customer by id (IDOR)', (data ?? []).length === 0);
    const { data: d2 } = await cB1.from('customers').select('id').eq('id', custA);
    check('B1 cannot fetch company A customer by id (IDOR)', (d2 ?? []).length === 0);
  }
  // ---------- 4. cross-tenant writes ----------
  {
    const { error } = await cA1.from('customers').insert({ company_id: B, name_ar: `${tag}-xtenant` });
    check('A1 cannot insert into company B', !!error, error?.code);
    const { data } = await cA1.from('customers').update({ name_ar: 'hacked' }).eq('id', custB).select('id');
    check('A1 cross-tenant UPDATE affects 0 rows', (data ?? []).length === 0);
    const { data: d2 } = await cA1.from('customers').delete().eq('id', custB).select('id');
    check('A1 cross-tenant DELETE affects 0 rows', (d2 ?? []).length === 0);
    const { data: still } = await admin.from('customers').select('id, name_ar').eq('id', custB).single();
    check('company B customer row untouched', still?.name_ar === `${tag}-custB`);
  }
  // ---------- 5. HR / payroll confidentiality ----------
  {
    const { data } = await cA2.from('employee_sensitive').select('id');
    check('technician cannot read employee_sensitive (IBAN/salary)', (data ?? []).length === 0);
    const { data: d2 } = await cA2.from('payroll_items').select('id');
    check('technician cannot read payroll_items', (d2 ?? []).length === 0);
    const { data: d3 } = await cB1.from('employee_sensitive').select('id');
    check('other-tenant owner cannot read company A employee_sensitive', (d3 ?? []).length === 0);
  }
  // ---------- 6. analytics RPC authorization ----------
  {
    const { error } = await anonClient.rpc('analytics_executive', { _from: '2026-01-01', _to: '2026-12-31' });
    check('anon cannot execute analytics_executive', !!error, error?.code ?? error?.message);
    const { error: e2 } = await anonClient.rpc('current_company_id');
    check('anon cannot execute current_company_id', !!e2, e2?.code);

    const { data: costs } = await cA2.rpc('analytics_can_view_costs');
    check('technician analytics_can_view_costs = false', costs === false, String(costs));
    const { data: fin } = await cA2.rpc('analytics_can_view_finance');
    check('technician analytics_can_view_finance = false', fin === false, String(fin));
    const { error: e3 } = await cA2.rpc('analytics_finance', { _from: '2026-01-01', _to: '2026-12-31' });
    check('technician blocked from analytics_finance', !!e3 && /FORBIDDEN/.test(e3.message ?? ''), e3?.message);
    const { error: e4 } = await cA2.rpc('analytics_hr', { _from: '2026-01-01', _to: '2026-12-31', _department_id: null });
    check('technician blocked from analytics_hr', !!e4 && /FORBIDDEN/.test(e4.message ?? ''), e4?.message);

    const { data: okFin, error: e5 } = await cA1.rpc('analytics_finance', { _from: '2026-01-01', _to: '2026-12-31' });
    check('accountant allowed analytics_finance', !e5 && !!okFin, e5?.message);
  }
  // ---------- 6b. raw finance rows are role-restricted ----------
  {
    for (const [table, id] of [
      ['journal_entries', journalA.id], ['bank_accounts', bankA.id],
      ['cash_vouchers', voucherA.id], ['bank_statement_lines', statementA.id],
    ]) {
      const { data: denied } = await cA2.from(table).select('id').eq('id', id);
      check(`technician cannot read raw finance table ${table}`, (denied ?? []).length === 0, `${denied?.length ?? 0} rows`);
      const { data: allowed, error } = await cA1.from(table).select('id').eq('id', id);
      check(`accountant can read raw finance table ${table}`, !error && allowed?.[0]?.id === id, error?.message);
    }
  }
  // ---------- 7. analytics data is company scoped ----------
  {
    const { error: invErr } = await admin.from('invoices').insert([
      { company_id: A, customer_id: custA, invoice_number: `${tag}-INV-A`, subtotal: 1000, vat_amount: 150, total: 1150, status: 'issued', issue_date: '2026-06-01' },
      { company_id: B, customer_id: custB, invoice_number: `${tag}-INV-B`, subtotal: 9999, vat_amount: 1499.85, total: 11498.85, status: 'issued', issue_date: '2026-06-01' },
    ]);
    check('seed invoices inserted for analytics scope test', !invErr, invErr?.message);
    const { data: finA } = await cA1.rpc('analytics_finance', { _from: '2026-01-01', _to: '2026-12-31' });
    const outputVat = Number(finA?.vat?.output ?? -1);
    check('analytics_finance VAT scoped to own tenant only', outputVat === 150, `output=${outputVat} (B's 1499.85 must not leak)`);
    const recv = Number(finA?.receivables?.open_invoices ?? -1);
    check('analytics_finance receivables scoped to own tenant', recv === 1150, `open=${recv}`);
  }
  // ---------- 8. export audit logging ----------
  {
    const validScope = { from: '2026-01-01', to: '2026-12-31' };
    const { error } = await anonClient.rpc('analytics_log_export', { _report: 'finance', _format: 'csv', _scope: validScope });
    check('anon cannot log an export', !!error, error?.code);
    const { error: e2 } = await cA1.rpc('analytics_log_export', { _report: 'finance', _format: 'csv', _scope: validScope });
    check('authenticated export is audit-logged', !e2, e2?.message);
    const { data: logs } = await admin.from('audit_logs').select('id, company_id').eq('company_id', A).limit(5);
    check('audit_logs row written with company scope', (logs ?? []).length > 0);

    const invalidCases = [
      ['unknown report', { _report: 'finance-drop-table', _format: 'csv', _scope: validScope }],
      ['unknown format', { _report: 'finance', _format: 'xlsx', _scope: validScope }],
      ['unknown scope key', { _report: 'finance', _format: 'csv', _scope: { ...validScope, companyId: B } }],
      ['filter not valid for report', { _report: 'finance', _format: 'csv', _scope: { ...validScope, customerId: custA } }],
    ];
    for (const [name, args] of invalidCases) {
      const { error: invalidError } = await cA1.rpc('analytics_log_export', args);
      check(`export audit rejects ${name}`, !!invalidError, invalidError?.message);
    }
  }
  // ---------- 8b. invoice cannot be issued without complete company identity ----------
  {
    const { data: cX } = await admin.from('companies').insert({ name_ar: `${tag}-noidentity` }).select('id').single();
    created.companies.push(cX.id);
    const { data: custX } = await admin.from('customers').insert({ company_id: cX.id, name_ar: `${tag}-cx` }).select('id').single();
    const { error } = await admin.from('invoices').insert({
      company_id: cX.id, customer_id: custX.id, invoice_number: `${tag}-INV-X`,
      subtotal: 100, vat_amount: 15, total: 115, status: 'issued', issue_date: '2026-06-01' });
    check('invoice issue blocked without VAT number / national address', !!error && /INVOICE_BLOCKED/.test(error.message), error?.message);
  }

  // ---------- 8c. role-restricted writes on commercial documents ----------
  {
    const t = [
      ['customers', { company_id: A, name_ar: `${tag}-deny` }],
      ['quotations', { company_id: A, customer_id: custA, quote_number: `${tag}-Q` }],
      ['sales_orders', { company_id: A, customer_id: custA, order_number: `${tag}-SO` }],
      ['invoices', { company_id: A, customer_id: custA, invoice_number: `${tag}-I2` }],
      ['payments', { company_id: A, amount: 1 }],
    ];
    for (const [table, row] of t) {
      const { error } = await cA2.from(table).insert(row);
      check(`technician cannot write ${table}`, !!error, error?.code);
    }
    const { error: okErr } = await cA1.from('invoices').insert({
      company_id: A, customer_id: custA, invoice_number: `${tag}-INV-OK`,
      subtotal: 100, vat_amount: 15, total: 115, status: 'draft' });
    check('accountant can write invoices (no false lockout)', !okErr, okErr?.message);
  }

  // ---------- 9. privilege escalation via user_roles ----------
  {
    const { error } = await cA2.from('user_roles').insert({ user_id: a2.id, role: 'super_admin' });
    check('technician cannot self-grant super_admin', !!error, error?.code);
    const { data } = await cA2.from('user_roles').select('user_id, role');
    check('technician cannot enumerate other users roles', (data ?? []).every((r) => r.user_id === a2.id), `${data?.length} rows`);
    const { data: ownRole, error: ownRoleError } = await cA2.rpc('has_role', { _user_id: a2.id, _role: 'technician' });
    check('has_role permits checking own role', !ownRoleError && ownRole === true, ownRoleError?.message);
    const { data: foreignRole, error: foreignRoleError } = await cA2.rpc('has_role', { _user_id: b1.id, _role: 'factory_owner' });
    check('has_role does not reveal another user role', !!foreignRoleError || foreignRole === false, String(foreignRole));
  }
  // ---------- 10. profile tenant hopping ----------
  {
    for (const [role, client, user] of [['technician', cA2, a2], ['general_manager', cA3, a3]]) {
      const { data, error } = await client.from('profiles').update({ company_id: B }).eq('id', user.id).select('company_id');
      const hopped = !error && data?.[0]?.company_id === B;
      if (!hopped) {
        const { data: after } = await client.from('profiles').select('company_id').eq('id', user.id).single();
        check(`${role} profile remains in original company`, after?.company_id === A, String(after?.company_id));
      }
      check(`${role} cannot move own profile to another company`, !hopped, hopped ? 'TENANT HOP POSSIBLE' : error?.code ?? 'blocked');
      if (hopped) await admin.from('profiles').update({ company_id: A }).eq('id', user.id);
    }
  }

  // ---------- 11. document kind authorization + reviewed-content lock ----------
  {
    const { data: doc, error: docError } = await admin.from('generated_documents').insert({
      company_id: A, kind: 'quotation', entity: 'quotations', entity_id: custA,
      snapshot: { source: tag }, created_by: a3.id,
    }).select('id').single();
    check('generated quotation fixture created', !docError && !!doc, docError?.message);
    if (doc) {
      const { data: denied } = await cA2.from('generated_documents').select('id').eq('id', doc.id);
      check('technician cannot read generated quotation', (denied ?? []).length === 0);
      const { data: allowed } = await cA3.from('generated_documents').select('id').eq('id', doc.id);
      check('general manager can read generated quotation', allowed?.[0]?.id === doc.id);
      const review = await cA3.from('generated_documents').update({ status: 'review' }).eq('id', doc.id).select('status');
      check('document can enter review', !review.error && review.data?.[0]?.status === 'review', review.error?.message);
      const altered = await cA3.from('generated_documents').update({ snapshot: { source: 'altered' } }).eq('id', doc.id);
      check('reviewed document content cannot be altered in place', !!altered.error && /DOC_REVIEW_CONTENT_LOCKED/.test(altered.error.message), altered.error?.message);
    }
  }

  // ---------- 12. cross-tenant customer references are rejected ----------
  {
    const { error } = await cA3.from('quotations').insert({
      company_id: A, customer_id: custB, quote_number: `${tag}-cross-customer`,
    });
    check('quotation cannot reference another tenant customer', !!error, error?.code ?? error?.message);
  }

  // ---------- 13. approved identity is immutable until reset by an admin ----------
  {
    const { data: identityRow, error: insertError } = await cA3.from('company_identity').insert({
      company_id: A, legal_name_ar: `${tag}-identity`, status: 'draft',
    }).select('id').single();
    check('company identity starts as draft', !insertError && !!identityRow, insertError?.message);
    if (identityRow) {
      const approved = await cA3.from('company_identity').update({
        status: 'approved', reviewed_by: a3.id, reviewed_at: new Date().toISOString(),
      }).eq('id', identityRow.id).select('status');
      check('general manager can approve company identity', !approved.error && approved.data?.[0]?.status === 'approved', approved.error?.message);
      const altered = await cA3.from('company_identity').update({ legal_name_ar: 'altered after approval' }).eq('id', identityRow.id);
      check('approved identity cannot be edited in place', !!altered.error && /IDENTITY_APPROVAL_LOCKED/.test(altered.error.message), altered.error?.message);
    }
  }

  // ---------- 14. disabled users lose tenant access and cannot reactivate ----------
  {
    const { error: disableError } = await admin.from('profiles').update({ is_active: false }).eq('id', a2.id);
    check('service path can disable a test account', !disableError, disableError?.message);
    const { data: hidden } = await cA2.from('customers').select('id').eq('company_id', A);
    check('disabled account loses tenant data access', (hidden ?? []).length === 0, `${hidden?.length ?? 0} rows`);
    const reactivation = await cA2.from('profiles').update({ is_active: true }).eq('id', a2.id);
    check('disabled account cannot reactivate itself', !!reactivation.error, reactivation.error?.message);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
}

async function cleanup() {
  for (const t of ['audit_logs', 'payments', 'invoice_items', 'invoices', 'sales_order_items', 'sales_orders', 'quotation_items', 'quotations', 'employee_sensitive', 'employees', 'customers'])
    await admin.from(t).delete().in('company_id', created.companies);
  await admin.from('user_roles').delete().in('user_id', created.users);
  await admin.from('profiles').delete().in('id', created.users);
  await admin.from('companies').delete().in('id', created.companies);
  for (const id of created.users) await admin.auth.admin.deleteUser(id);
  console.log('cleanup done: removed', created.users.length, 'users and', created.companies.length, 'companies');
}

try { await main(); } catch (e) { console.error('HARNESS ERROR', e); fail++; }
finally { await cleanup(); }
process.exit(fail > 0 ? 1 : 0);
