/**
 * Workflow / state-machine test harness (Module 13).
 * Runs real UPDATE-driven state transitions over PostgREST with genuine JWTs
 * (roles: general_manager, accountant, technician), then deletes everything it
 * created. No permanent test data remains, and no existing rows are touched.
 *
 * Run: bun scripts/security/workflow-flows.mjs
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
const signInClient = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: kf(ANON) } });
const asUser = (token) =>
  createClient(URL, ANON, { auth: { persistSession: false }, global: { fetch: kf(ANON), headers: { Authorization: `Bearer ${token}` } } });

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
};

const created = { users: [], companies: [] };
const tag = `wf-test-${Date.now()}`;
const identity = {
  vat_number: '300000000000003', address_building_no: '1234', address_street: 'ش',
  address_district: 'ح', address_city: 'الرياض', address_postal_code: '12345',
};

async function mkUser(email, password) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  created.users.push(data.user.id);
  const { data: s, error: se } = await signInClient().auth.signInWithPassword({ email, password });
  if (se) throw se;
  return { id: data.user.id, token: s.session.access_token };
}

/** Attempt a transition and report whether it was refused. */
async function transition(client, table, id, patch) {
  const { data, error } = await client.from(table).update(patch).eq('id', id).select('status');
  return { error, status: data?.[0]?.status };
}

async function main() {
  const { data: comp, error: ce } = await admin.from('companies')
    .insert({ name_ar: `${tag}-co`, ...identity }).select('id').single();
  if (ce) throw ce;
  const C = comp.id;
  created.companies.push(C);

  const pw = 'Test!' + Math.random().toString(36).slice(2, 12);
  const gm = await mkUser(`${tag}-gm@example.invalid`, pw);
  const acc = await mkUser(`${tag}-acc@example.invalid`, pw);
  const tech = await mkUser(`${tag}-tech@example.invalid`, pw);
  await admin.from('profiles').upsert([
    { id: gm.id, company_id: C, full_name: 'GM', email: `${tag}-gm@example.invalid` },
    { id: acc.id, company_id: C, full_name: 'ACC', email: `${tag}-acc@example.invalid` },
    { id: tech.id, company_id: C, full_name: 'TECH', email: `${tag}-tech@example.invalid` },
  ]);
  await admin.from('user_roles').insert([
    { user_id: gm.id, role: 'general_manager' },
    { user_id: acc.id, role: 'accountant' },
    { user_id: tech.id, role: 'technician' },
  ]);
  const cGm = asUser(gm.token), cAcc = asUser(acc.token), cTech = asUser(tech.token);

  // ---------- 0. Document numbering privileges + 20-way concurrency ----------
  const deniedNumber = await cGm.rpc('next_document_number', {
    _company_id: C, _doc_type: `${tag}-denied`, _prefix: 'TST',
  });
  check('ordinary authenticated users cannot call the internal number generator', !!deniedNumber.error, deniedNumber.error?.code);

  const parallelNumbers = await Promise.all(
    Array.from({ length: 20 }, () => admin.rpc('next_document_number', {
      _company_id: C, _doc_type: `${tag}-parallel`, _prefix: 'TST',
    })),
  );
  const issuedNumbers = parallelNumbers.map((result) => result.data).filter(Boolean);
  const suffixes = issuedNumbers.map((value) => Number(String(value).split('-').at(-1))).sort((a, b) => a - b);
  check('20 concurrent number requests all succeed', parallelNumbers.every((result) => !result.error), parallelNumbers.find((result) => result.error)?.error?.message);
  check('20 concurrent numbers are unique and gapless', new Set(issuedNumbers).size === 20 && suffixes.every((value, index) => value === index + 1), issuedNumbers.join(','));

  // ---------- 1. Manufacturing order state machine ----------
  const { data: mo, error: moErr } = await cGm.from('manufacturing_orders')
    .insert({ company_id: C, mo_number: `${tag}-MO`, status: 'draft', quantity: 5 }).select('id').single();
  check('manufacturing order created in draft', !moErr, moErr?.message);

  if (mo) {
    for (const bad of ['in_production', 'ready_for_delivery', 'delivered']) {
      const r = await transition(cGm, 'manufacturing_orders', mo.id, { status: bad });
      check(`MO draft -> ${bad} refused`, !!r.error, r.error?.message?.slice(0, 60));
    }
    const ok1 = await transition(cGm, 'manufacturing_orders', mo.id, { status: 'approved' });
    check('MO draft -> approved allowed', !ok1.error && ok1.status === 'approved', ok1.error?.message);

    const skip = await transition(cGm, 'manufacturing_orders', mo.id, { status: 'delivered' });
    check('MO approved -> delivered refused (cannot deliver before QC)', !!skip.error, skip.error?.message?.slice(0, 60));

    for (const step of ['ready_to_produce', 'in_production', 'quality_check', 'ready_for_delivery', 'delivered']) {
      const r = await transition(cGm, 'manufacturing_orders', mo.id, { status: step });
      check(`MO -> ${step} allowed in order`, !r.error && r.status === step, r.error?.message?.slice(0, 60));
    }
    const done = await transition(cGm, 'manufacturing_orders', mo.id, { status: 'in_production' });
    check('delivered MO is terminal (no reopen)', !!done.error, done.error?.message?.slice(0, 60));

    const tr = await transition(cTech, 'manufacturing_orders', mo.id, { status: 'cancelled' });
    check('technician cannot change MO status', !!tr.error || tr.status !== 'cancelled', tr.error?.code ?? 'no rows');
  }

  // ---------- 2. Journal entry posting rules ----------
  const { data: coa } = await admin.from('chart_of_accounts').insert([
    { company_id: C, code: '1100', name_ar: 'النقد', account_type: 'asset', is_postable: true },
    { company_id: C, code: '4100', name_ar: 'المبيعات', account_type: 'revenue', is_postable: true },
    { company_id: C, code: '1000', name_ar: 'الأصول', account_type: 'asset', is_postable: false },
  ]).select('id, code');
  const cash = coa.find((a) => a.code === '1100').id;
  const rev = coa.find((a) => a.code === '4100').id;
  const header = coa.find((a) => a.code === '1000').id;

  await admin.from('fiscal_periods').insert({
    company_id: C, code: '2026-06', start_date: '2026-06-01', end_date: '2026-06-30', status: 'open',
  });

  const { data: je, error: jeErr } = await cAcc.from('journal_entries')
    .insert({ company_id: C, entry_number: `${tag}-JE`, entry_date: '2026-06-01', status: 'draft' })
    .select('id').single();
  check('accountant can create a draft journal entry', !jeErr, jeErr?.message);

  if (je) {
    const nonPostable = await cAcc.from('journal_entry_lines')
      .insert({ journal_entry_id: je.id, line_no: 1, account_id: header, debit: 100, credit: 0 });
    check('posting to a non-postable header account is refused', !!nonPostable.error, nonPostable.error?.message?.slice(0, 40));

    await cAcc.from('journal_entry_lines')
      .insert({ journal_entry_id: je.id, line_no: 1, account_id: cash, debit: 115, credit: 0 });
    await cAcc.from('journal_entry_lines')
      .insert({ journal_entry_id: je.id, line_no: 2, account_id: rev, debit: 0, credit: 100 });

    const unbalanced = await transition(cAcc, 'journal_entries', je.id, { status: 'posted' });
    check('unbalanced entry cannot be posted', !!unbalanced.error, unbalanced.error?.message?.slice(0, 40));

    await cAcc.from('journal_entry_lines').update({ credit: 115 }).eq('journal_entry_id', je.id).eq('line_no', 2);
    const balanced = await transition(cAcc, 'journal_entries', je.id, { status: 'posted' });
    check('balanced entry posts successfully', !balanced.error && balanced.status === 'posted', balanced.error?.message);

    const addLine = await cAcc.from('journal_entry_lines')
      .insert({ journal_entry_id: je.id, line_no: 3, account_id: cash, debit: 1, credit: 0 });
    check('posted entry is immutable (cannot add lines)', !!addLine.error, addLine.error?.message?.slice(0, 40));

    const delEntry = await cAcc.from('journal_entries').delete().eq('id', je.id).select('id');
    check('posted entry cannot be deleted', !!delEntry.error || (delEntry.data ?? []).length === 0, delEntry.error?.message?.slice(0, 40));

    const backToDraft = await transition(cAcc, 'journal_entries', je.id, { status: 'draft' });
    check('posted entry cannot be reverted to draft', !!backToDraft.error, backToDraft.error?.message?.slice(0, 40));

    const techPost = await cTech.from('journal_entries')
      .insert({ company_id: C, entry_number: `${tag}-JE2`, entry_date: '2026-06-01', status: 'draft' });
    check('technician cannot create journal entries', !!techPost.error, techPost.error?.code);
  }

  // ---------- 3. Duplicate document numbers are impossible ----------
  const dup = await cGm.from('manufacturing_orders')
    .insert({ company_id: C, mo_number: `${tag}-MO`, status: 'draft', quantity: 1 });
  check('duplicate MO number rejected by unique constraint', !!dup.error, dup.error?.code);

  // ---------- 4. Payment approval limits and execution state machine ----------
  const { data: supplier, error: supplierError } = await admin.from('suppliers').insert({
    company_id: C, code: `${tag}-SUP`, name_ar: 'مورد اختبار',
  }).select('id').single();
  check('payment supplier fixture created', !supplierError && !!supplier, supplierError?.message);

  if (supplier) {
    const { data: invoices, error: invoiceError } = await admin.from('supplier_invoices').insert([
      {
        company_id: C, supplier_id: supplier.id, supplier_invoice_number: `${tag}-SI-small`,
        status: 'approved', subtotal: 1000, vat_amount: 150, total: 1150,
      },
      {
        company_id: C, supplier_id: supplier.id, supplier_invoice_number: `${tag}-SI-large`,
        status: 'approved', subtotal: 300001, vat_amount: 0, total: 300001,
      },
    ]).select('id, total');
    check('approved supplier invoice fixtures created', !invoiceError && invoices?.length === 2, invoiceError?.message);

    const smallInvoice = invoices?.find((row) => Number(row.total) === 1150);
    const largeInvoice = invoices?.find((row) => Number(row.total) === 300001);
    if (smallInvoice) {
      const { data: payment, error: paymentError } = await cAcc.from('payment_requests').insert({
        company_id: C, pay_number: `${tag}-PAY-small`, supplier_id: supplier.id,
        supplier_invoice_id: smallInvoice.id, amount: 1000, requested_by: acc.id,
      }).select('id').single();
      check('accountant can create a draft payment request', !paymentError && !!payment, paymentError?.message);
      if (payment) {
        const submitted = await transition(cAcc, 'payment_requests', payment.id, { status: 'submitted' });
        check('payment draft -> submitted allowed', !submitted.error && submitted.status === 'submitted', submitted.error?.message);
        const accountantApproval = await transition(cAcc, 'payment_requests', payment.id, {
          status: 'approved', approved_by: acc.id,
        });
        check('accountant cannot approve payment', !!accountantApproval.error && /PAYMENT_APPROVAL_LIMIT_EXCEEDED/.test(accountantApproval.error.message), accountantApproval.error?.message);
        const managerApproval = await transition(cGm, 'payment_requests', payment.id, {
          status: 'approved', approved_by: gm.id,
        });
        check('general manager can approve payment within limit', !managerApproval.error && managerApproval.status === 'approved', managerApproval.error?.message);
        const executed = await transition(cAcc, 'payment_requests', payment.id, {
          status: 'executed', bank_reference: `${tag}-BANK-REF`, accounting_posted: true,
          executed_at: new Date().toISOString(),
        });
        check('accountant executes an approved payment with proof', !executed.error && executed.status === 'executed', executed.error?.message);
        const mutateExecuted = await cAcc.from('payment_requests').update({ amount: 999 }).eq('id', payment.id);
        check(
          'executed payment is immutable',
          !!mutateExecuted.error && /PAYMENT_AMOUNT_LOCKED|EXECUTED_PAYMENT_IMMUTABLE/.test(mutateExecuted.error.message),
          mutateExecuted.error?.message,
        );
        const { data: hidden } = await cTech.from('payment_requests').select('id').eq('id', payment.id);
        check('technician cannot read payment requests', (hidden ?? []).length === 0);
      }
    }

    if (largeInvoice) {
      const { data: payment, error: paymentError } = await cAcc.from('payment_requests').insert({
        company_id: C, pay_number: `${tag}-PAY-large`, supplier_id: supplier.id,
        supplier_invoice_id: largeInvoice.id, amount: 300001, requested_by: acc.id,
      }).select('id').single();
      check('large payment request starts as draft', !paymentError && !!payment, paymentError?.message);
      if (payment) {
        await transition(cAcc, 'payment_requests', payment.id, { status: 'submitted' });
        const overLimit = await transition(cGm, 'payment_requests', payment.id, {
          status: 'approved', approved_by: gm.id,
        });
        check('general manager cannot exceed 250,000 SAR approval limit', !!overLimit.error && /PAYMENT_APPROVAL_LIMIT_EXCEEDED/.test(overLimit.error.message), overLimit.error?.message);
      }
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
}

async function cleanup() {
  for (const t of ['journal_entry_lines'])
    await admin.from(t).delete().in('journal_entry_id',
      ((await admin.from('journal_entries').select('id').in('company_id', created.companies)).data ?? []).map((r) => r.id));
  for (const t of ['payment_requests', 'supplier_invoice_items', 'supplier_invoices', 'supplier_contacts', 'suppliers', 'audit_logs', 'journal_entries', 'fiscal_periods', 'chart_of_accounts', 'manufacturing_orders'])
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
