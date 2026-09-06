import https from 'node:https';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function send(res, status, body) {
  res.statusCode = status;
  for (const [key, value] of Object.entries(JSON_HEADERS)) res.setHeader(key, value);
  res.end(JSON.stringify(body));
}

function normalizeBaseUrl(value) {
  const raw = String(value || '').trim().replace(/\/$/, '');
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    return url.origin + url.pathname.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function toNumber(value) {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function pick(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] != null && obj[key] !== '') return obj[key];
  }
  return null;
}

function unwrap(row, wrappers) {
  for (const key of wrappers) {
    if (row?.[key]) return row[key];
  }
  return row || {};
}

function normalizeRecord(row, wrappers) {
  const doc = unwrap(row, wrappers);
  const subtotal = toNumber(pick(doc, [
    'summary_subtotal', 'subtotal', 'total_before_tax', 'amount_before_tax', 'net_amount', 'amount'
  ]));
  const total = toNumber(pick(doc, [
    'summary_total', 'total', 'grand_total', 'total_amount', 'amount_after_tax'
  ]));
  let tax = toNumber(pick(doc, [
    'summary_tax', 'tax_total', 'total_tax', 'vat_total', 'tax_amount', 'vat_amount'
  ]));
  if (!tax && total >= subtotal && total > 0) tax = total - subtotal;

  return {
    id: pick(doc, ['id']),
    no: pick(doc, ['no', 'invoice_no', 'code', 'number']),
    date: pick(doc, ['date', 'issue_date', 'created', 'expense_date']),
    subtotal,
    total,
    tax,
    draft: pick(doc, ['draft']),
    type: pick(doc, ['type', 'document_type']),
    status: pick(doc, ['status', 'invoice_status', 'payment_status', 'state']),
    delivery_status: pick(doc, ['delivery_status', 'shipping_status', 'fulfillment_status', 'requisition_delivery_status', 'order_status']),
    description: pick(doc, ['description', 'notes', 'note', 'title', 'name']),
    client: pick(doc, ['client_business_name', 'client_name', 'customer_name', 'business_name']),
    vendor: pick(doc, ['supplier_business_name', 'vendor_name', 'payee', 'beneficiary', 'supplier_name']),
    category: pick(doc, ['category_name', 'expense_category', 'category']),
    payment_method: pick(doc, ['payment_method', 'payment_type', 'method']),
    reference: pick(doc, ['reference', 'ref_no', 'reference_no']),
  };
}

function fetchJson(url, apiKey) {
  const target = url instanceof URL ? url : new URL(url);

  return new Promise((resolve) => {
    const request = https.request(target, {
      method: 'GET',
      headers: { accept: 'application/json', APIKEY: apiKey },
      timeout: 12000,
    }, (response) => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { text += chunk; });
      response.on('end', () => {
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
        const status = response.statusCode || 0;
        resolve({ ok: status >= 200 && status < 300, status, json });
      });
    });

    request.on('timeout', () => request.destroy(new Error('daftra_request_timeout')));
    request.on('error', () => resolve({ ok: false, status: 0, json: null }));
    request.end();
  });
}

async function fetchLegacyList(baseUrl, apiKey, resource, dateFrom, dateTo) {
  const all = [];
  const limit = 100;
  for (let page = 1; page <= 50; page += 1) {
    const url = new URL(`${baseUrl}/api2/${resource}.json`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('date_from', dateFrom);
    url.searchParams.set('date_to', dateTo);
    url.searchParams.set('recursive', '1');

    const result = await fetchJson(url, apiKey);
    if (!result.ok) return { ...result, records: all };

    const body = result.json || {};
    const rows = Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.result?.data)
        ? body.result.data
        : Array.isArray(body)
          ? body
          : [];

    all.push(...rows);
    if (rows.length < limit) return { ok: true, status: result.status, records: all };
  }
  return { ok: true, status: 200, records: all, truncated: true };
}

function paymentRows(json) {
  const d = json?.data || json || {};
  const candidates = [
    d.InvoicePayment,
    d.InvoicePayments,
    d.invoice_payments,
    d.payments,
    d.Invoice?.InvoicePayment,
    d.Invoice?.InvoicePayments,
    d.Invoice?.invoice_payments,
    d.Invoice?.payments,
  ];
  for (const value of candidates) if (Array.isArray(value)) return value;
  return [];
}

function normalizePayment(row) {
  const p = row?.InvoicePayment || row || {};
  return {
    id: pick(p, ['id']),
    date: pick(p, ['date', 'created']),
    amount: round2(toNumber(pick(p, ['amount', 'payment_amount', 'total']))),
    status: pick(p, ['status']),
    payment_method: pick(p, ['payment_method', 'method']),
    transaction_id: pick(p, ['transaction_id', 'reference', 'ref_no']),
  };
}

async function enrichSalesRows(baseUrl, apiKey, rows, dateFrom, dateTo) {
  return Promise.all(rows.map(async (row) => {
    if (!row.id) return row;
    const detailUrl = new URL(`/api2/invoices/${encodeURIComponent(row.id)}.json`, `${baseUrl}/`);
    const detail = await fetchJson(detailUrl, apiKey);
    if (!detail.ok) return { ...row, detail_status: detail.status, payments: [], paid_total: 0, paid_in_period: 0, paid_after_period: 0, calculated_balance: row.total };
    const payments = paymentRows(detail.json).map(normalizePayment).filter((p) => p.amount > 0);
    const paidTotal = round2(payments.reduce((s, p) => s + p.amount, 0));
    const paidInPeriod = round2(payments.filter((p) => String(p.date || '').slice(0, 10) >= dateFrom && String(p.date || '').slice(0, 10) <= dateTo).reduce((s, p) => s + p.amount, 0));
    const paidAfterPeriod = round2(payments.filter((p) => String(p.date || '').slice(0, 10) > dateTo).reduce((s, p) => s + p.amount, 0));
    return {
      ...row,
      detail_status: detail.status,
      payments,
      paid_total: paidTotal,
      paid_in_period: paidInPeriod,
      paid_after_period: paidAfterPeriod,
      calculated_balance: round2(Math.max(0, row.total - paidTotal)),
    };
  }));
}

function summarize(records) {
  const usable = records.filter((r) => String(r.draft ?? '0') !== '1');
  const subtotal = usable.reduce((sum, r) => sum + r.subtotal, 0);
  const total = usable.reduce((sum, r) => sum + r.total, 0);
  let tax = usable.reduce((sum, r) => sum + r.tax, 0);
  if (!tax && total >= subtotal) tax = total - subtotal;
  return { count: usable.length, subtotal: round2(subtotal), tax: round2(tax), total: round2(total) };
}

function safeSummary(result, wrappers, includeRows = false) {
  if (!result?.ok) return { available: false, status: result?.status ?? null, count: 0, subtotal: 0, tax: 0, total: 0 };
  const rows = result.records.map((row) => normalizeRecord(row, wrappers));
  const summary = { available: true, status: result.status, ...summarize(rows), rows_received: rows.length, truncated: Boolean(result.truncated) };
  if (includeRows) summary.rows = rows.filter((r) => String(r.draft ?? '0') !== '1');
  return summary;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('allow', 'GET');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const baseUrl = normalizeBaseUrl(process.env.DAFTRA_BASE_URL);
  const apiKey = process.env.DAFTRA_API_KEY;
  if (!baseUrl || !apiKey) return send(res, 503, { ok: false, error: 'daftra_not_configured' });

  const dateFrom = String(req.query?.from || '2026-04-01');
  const dateTo = String(req.query?.to || '2026-06-30');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    return send(res, 400, { ok: false, error: 'invalid_date_format' });
  }

  const [salesResult, purchasesResult, expensesResult, creditNotesResult, purchaseRefundsResult] = await Promise.all([
    fetchLegacyList(baseUrl, apiKey, 'invoices', dateFrom, dateTo),
    fetchLegacyList(baseUrl, apiKey, 'purchase_invoices', dateFrom, dateTo),
    fetchLegacyList(baseUrl, apiKey, 'expenses', dateFrom, dateTo),
    fetchLegacyList(baseUrl, apiKey, 'credit_notes', dateFrom, dateTo),
    fetchLegacyList(baseUrl, apiKey, 'purchase_refunds', dateFrom, dateTo),
  ]);

  if (!salesResult.ok) {
    return send(res, 502, { ok: false, provider: 'daftra', period: { from: dateFrom, to: dateTo }, sales_status: salesResult.status, error: 'daftra_sales_fetch_failed' });
  }

  const sales = safeSummary(salesResult, ['Invoice', 'invoice'], true);
  sales.rows = await enrichSalesRows(baseUrl, apiKey, sales.rows || [], dateFrom, dateTo);
  sales.payment_reconciliation = {
    paid_in_period: round2(sales.rows.reduce((s, r) => s + toNumber(r.paid_in_period), 0)),
    paid_after_period: round2(sales.rows.reduce((s, r) => s + toNumber(r.paid_after_period), 0)),
    paid_total: round2(sales.rows.reduce((s, r) => s + toNumber(r.paid_total), 0)),
    calculated_balance: round2(sales.rows.reduce((s, r) => s + toNumber(r.calculated_balance), 0)),
  };

  const purchases = safeSummary(purchasesResult, ['PurchaseInvoice', 'purchase_invoice', 'Invoice'], true);
  const expenses = safeSummary(expensesResult, ['Expense', 'expense'], true);
  const creditNotes = safeSummary(creditNotesResult, ['CreditNote', 'Invoice', 'credit_note']);
  const purchaseRefunds = safeSummary(purchaseRefundsResult, ['PurchaseRefund', 'PurchaseInvoice', 'purchase_refund']);

  const outputTax = round2(sales.tax - creditNotes.tax);
  const grossInputTax = round2(purchases.tax + expenses.tax);
  const inputTax = round2(grossInputTax - purchaseRefunds.tax);
  const netPayable = round2(outputTax - inputTax);

  return send(res, 200, {
    ok: true,
    provider: 'daftra',
    mode: 'read_only',
    period: { from: dateFrom, to: dateTo },
    sales,
    purchases,
    expenses,
    adjustments: { sales_credit_notes: creditNotes, purchase_refunds: purchaseRefunds },
    vat: {
      gross_output_tax: sales.tax,
      less_sales_credit_note_tax: creditNotes.tax,
      output_tax: outputTax,
      purchase_invoice_tax: purchases.tax,
      expense_tax: expenses.tax,
      gross_input_tax: grossInputTax,
      less_purchase_refund_tax: purchaseRefunds.tax,
      input_tax: inputTax,
      net_payable: netPayable,
    },
    warning: 'Pre-filing review only. Payment timing alone does not determine VAT due when a tax invoice has already been issued; confirm supply and document dates before submitting to ZATCA.',
    checked_at: new Date().toISOString(),
  });
}
