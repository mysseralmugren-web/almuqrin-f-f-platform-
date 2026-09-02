import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, "skills/finance/manifest.json"), "utf8"));
const must = (ok, msg) => { if (!ok) throw new Error(msg); };
const exists = (p) => fs.existsSync(path.join(root, p));

const tests = [
  ["01 skill count is exactly 17", () => must(manifest.skill_count === 17 && manifest.skills.length === 17, "FINANCE_SKILL_COUNT_INVALID")],
  ["02 skill ids are unique", () => must(new Set(manifest.skills).size === 17, "FINANCE_SKILL_DUPLICATE")],
  ["03 every skill has SKILL.md", () => must(manifest.skills.every((s) => exists(`skills/finance/${s}/SKILL.md`)), "FINANCE_SKILL_FILE_MISSING")],
  ["04 orchestrator exists", () => must(manifest.skills.includes("finance-ai-orchestrator"), "FINANCE_ORCHESTRATOR_MISSING")],
  ["05 control agent exists", () => must(manifest.skills.includes("financial-control-agent"), "FINANCE_CONTROL_AGENT_MISSING")],
  ["06 supplier invoice pipeline ends with control gate", () => must(manifest.pipelines.supplier_invoice.at(-1) === "financial-control-agent", "SUPPLIER_PIPELINE_CONTROL_GATE_MISSING")],
  ["07 expense pipeline ends with control gate", () => must(manifest.pipelines.expense.at(-1) === "financial-control-agent", "EXPENSE_PIPELINE_CONTROL_GATE_MISSING")],
  ["08 VAT skill is in supplier invoice pipeline", () => must(manifest.pipelines.supplier_invoice.includes("saudi-vat-compliance"), "VAT_CHECK_MISSING")],
  ["09 PO matching is before control gate", () => must(manifest.pipelines.supplier_invoice.indexOf("match-invoice-to-purchase-order") < manifest.pipelines.supplier_invoice.indexOf("financial-control-agent"), "PO_MATCH_ORDER_INVALID")],
  ["10 no automatic payment", () => must(manifest.governance.auto_payment === false, "AUTO_PAYMENT_MUST_BE_DISABLED")],
  ["11 no automatic journal posting or IBAN change", () => must(manifest.governance.auto_journal_posting === false && manifest.governance.auto_iban_change === false, "HIGH_IMPACT_AUTOMATION_MUST_BE_DISABLED")],
  ["12 tenant isolation and human approval are mandatory", () => must(manifest.governance.tenant_isolation === true && manifest.governance.human_approval_for_high_impact === true && manifest.governance.financial_control_gate_required === true, "FINANCE_GOVERNANCE_INVALID")],
  ["13 quarterly ZATCA statements skill exists", () => must(manifest.skills.includes("quarterly-zatca-financial-statements"), "QUARTERLY_ZATCA_SKILL_MISSING")],
  ["14 quarterly compliance pipeline ends with control gate", () => must(manifest.pipelines.quarterly_compliance?.includes("quarterly-zatca-financial-statements") && manifest.pipelines.quarterly_compliance.at(-1) === "financial-control-agent", "QUARTERLY_COMPLIANCE_GATE_INVALID")],
  ["15 no automatic ZATCA submission", () => must(manifest.governance.auto_zatca_submission === false, "AUTO_ZATCA_SUBMISSION_MUST_BE_DISABLED")],
  ["16 bank reconciliation skill exists and pipeline ends with control gate", () => must(manifest.skills.includes("bank-statement-reconciliation-audit") && manifest.pipelines.bank_reconciliation?.at(-1) === "financial-control-agent", "BANK_RECONCILIATION_GATE_INVALID")],
  ["17 no automatic bank balance adjustment or month close", () => must(manifest.governance.auto_bank_balance_adjustment === false && manifest.governance.auto_month_close === false, "AUTO_BANK_RECONCILIATION_ACTION_MUST_BE_DISABLED")],
];

for (const [name, run] of tests) { run(); console.log(`✓ ${name}`); }
console.log(`Finance AI Suite acceptance: ${tests.length}/${tests.length} passed`);
