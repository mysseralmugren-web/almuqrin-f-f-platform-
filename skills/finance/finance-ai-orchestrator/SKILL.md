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

## Shared output
`facts`, `findings`, `risk_flags`, `recommendations`, `proposed_actions`, `confidence`, `skill_trace`.

## Governance
- كل مهارة تعمل داخل `company_id` الحالي فقط.
- `financial-control-agent` إلزامي قبل أي proposed action عالي التأثير.
- لا ترحيل قيود، لا دفع، لا تغيير IBAN، ولا اعتماد مالي نهائي بواسطة المنسق.
- أي override يجب أن يسجل المستخدم والسبب والوقت في audit log.
