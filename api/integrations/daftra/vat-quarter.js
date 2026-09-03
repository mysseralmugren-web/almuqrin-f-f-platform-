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
  };
}

async function fetchJson(url, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        APIKEY: apiKey,
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
    return { ok: response.ok, status: response.status, json };
  } finally {
    clearTimeout(timeout);
  }
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

    const result = await fetchJson(url.toString(), apiKey);
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

function summarize(records) {
  const usable = records.filter((r) => String(r.draft ?? '0') !== '1');
  const subtotal = usable.reduce((sum, r) => sum + r.subtotal, 0);
  const total = usable.reduce((sum, r) => sum + r.total, 0);
  let tax = usable.reduce((sum, r) => sum + r.tax, 0);
  if (!tax && total >= subtotal) tax = total - subtotal;
  return {
    count: usable.length,
    subtotal: round2(subtotal),
    tax: round2(tax),
    total: round2(total),
  };
}

function safeSummary(result, wrappers) {
  if (!result?.ok) return { available: false, status: result?.status ?? null, count: 0, subtotal: 0, tax: 0, total: 0 };
  const rows = result.records.map((row) => normalizeRecord(row, wrappers));
  return { available: true, status: result.status, ...summarize(rows), rows_received: rows.length, truncated: Boolean(result.truncated) };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('allow', 'GET');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const baseUrl = normalizeBaseUrl(process.env.DAFTRA_BASE_URL);
  const apiKey = process.env.DAFTRA_API_KEY;
  if (!baseUrl || !apiKey) {
    return send(res, 503, { ok: false, error: 'daftra_not_configured' });
  }

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
    return send(res, 502, {
      ok: false,
      provider: 'daftra',
      period: { from: dateFrom, to: dateTo },
      sales_status: salesResult.status,
      error: 'daftra_sales_fetch_failed',
    });
  }

  const sales = safeSummary(salesResult, ['Invoice', 'invoice']);
  const purchases = safeSummary(purchasesResult, ['PurchaseInvoice', 'purchase_invoice', 'Invoice']);
  const expenses = safeSummary(expensesResult, ['Expense', 'expense']);
  const creditNotes = safeSummary(creditNotesResult, ['CreditNote', 'Invoice', 'credit_note']);
  const purchaseRefunds = safeSummary(purchaseRefundsResult, ['PurchaseRefund', 'PurchaseInvoice', 'purchase_refund']);

  // VAT logic: sales credit notes reduce output VAT. Purchase refunds reduce recoverable input VAT.
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
    adjustments: {
      sales_credit_notes: creditNotes,
      purchase_refunds: purchaseRefunds,
    },
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
    warning: 'Pre-filing review only. Confirm tax eligibility and document dates before submitting to ZATCA.',
    checked_at: new Date().toISOString(),
  });
}
