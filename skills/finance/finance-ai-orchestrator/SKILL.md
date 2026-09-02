---
name: finance-ai-orchestrator
description: منسق Finance AI Suite يحدد المهارات المالية المناسبة ويشغلها بالترتيب مع بوابة رقابة واعتماد بشري.
---

# Purpose
تشغيل المهارات المالية كمسار واحد مترابط بدل استدعاءات منفصلة وغير منضبطة.

## Routing
- supplier invoice → invoice-processing-ai → match-invoice-to-purchase-order → saudi-vat-compliance → smart-expense-coding → detect-financial-anomalies → financial-control-agent.
- factory expense → manage-factory-expenses → saudi-vat-compliance → smart-expense-coding → detect-financial-anomalies → financial-control-agent.
- manufacturing/project review → factory-cost-accounting → project-profitability → analyze-financial-reports.
- liquidity planning → accounts-receivable-ai + accounts-payable-ai → cashflow-forecast → financial-planning-ai.
- monthly bank statement → bank-statement-reconciliation-audit → smart-expense-coding → accounts-receivable-ai + accounts-payable-ai → detect-financial-anomalies → analyze-financial-reports → financial-control-agent.
- quarterly financial statements / ZATCA reference pack → analyze-financial-reports → project-profitability → cashflow-forecast → saudi-vat-compliance → detect-financial-anomalies → quarterly-zatca-financial-statements → financial-control-agent.

## Shared output
`facts`, `findings`, `risk_flags`, `recommendations`, `proposed_actions`, `confidence`, `skill_trace`.

## Governance
- كل مهارة تعمل داخل `company_id` الحالي فقط.
- `financial-control-agent` إلزامي قبل أي proposed action عالي التأثير.
- كشف البنك الأصلي دليل غير قابل للتعديل؛ المطابقة والتصنيف طبقة منفصلة ومدققة.
- لا ترحيل قيود، لا دفع، لا تعديل رصيد بنك، لا إغلاق شهر، لا تغيير IBAN، لا تقديم ZATCA، ولا اعتماد مالي نهائي بواسطة المنسق.
- صافي الحركة البنكية لا يسمى ربحًا؛ الربح المحاسبي يحسب من دفتر الأستاذ والإيرادات والتكاليف والمصروفات وفق أساس الاستحقاق.
- القوائم والتسويات يمكن توليدها كمسودة؛ الاعتماد والإقفال والتقديم الرسمي بيد المستخدم المخول فقط.
- أي override يجب أن يسجل المستخدم والسبب والوقت في audit log.
