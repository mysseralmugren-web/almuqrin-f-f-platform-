---
name: bank-statement-reconciliation-audit
description: تحليل كشف الحساب البنكي الشهري المعتمد للمصنع، تصنيف جميع الحركات الداخلة والخارجة، مطابقتها مع القيود والفواتير والعملاء والموردين، وإعداد تسوية بنكية وتدقيق شهري مع فصل صافي الحركة النقدية عن صافي الربح المحاسبي.
---

# Purpose
تحويل كشف الحساب البنكي الشهري المعتمد إلى مسار تدقيق وتسوية محاسبية قابل للمراجعة، مع معرفة مصدر كل مبلغ داخل، وجهة وسبب كل مبلغ خارج، وربط الحركة بالمستند المحاسبي أو المشروع أو الطرف المقابل، ثم إعداد تقرير شهري للإدارة والمحاسب.

## Inputs
- company_id والحساب البنكي والفترة الشهرية.
- كشف حساب بنكي معتمد PDF/CSV/XLSX أو بيانات مستوردة من تكامل البنك.
- رصيد أول المدة ورصيد آخر المدة كما يظهران في كشف البنك.
- القيود المحاسبية ودفتر الأستاذ وحسابات البنك والنقد.
- فواتير العملاء والموردين وسندات القبض والصرف والمدفوعات.
- العملاء والموردون والموظفون والمشاريع وأوامر التصنيع ومراكز التكلفة.
- دليل الحسابات وقواعد الترميز المحاسبي المعتمدة للمصنع.

## Transaction extraction
لكل حركة بنكية يستخرج ويحفظ على الأقل:
- transaction_date وvalue_date.
- bank_reference والمرجع/الوصف الأصلي بدون فقده.
- direction: inflow أو outflow.
- amount وcurrency.
- counterparty_name وcounterparty_account/IBAN عند توفره.
- payment_channel: transfer/POS/card/ATM/fee/cheque/cash-deposit/other.
- proposed_reason والتصنيف المحاسبي المقترح.
- linked_customer / linked_supplier / linked_employee / linked_project / linked_invoice / linked_payment / linked_journal_entry عند وجود تطابق.
- confidence وsource_reference إلى صفحة/سطر كشف البنك.

## Inflow rules
يحدد سبب كل مبلغ داخل، مثل:
- دفعة عميل على عرض/أمر بيع/فاتورة.
- دفعة مقدمة من عميل.
- تحصيل ذمم مدينة.
- استرداد من مورد.
- تمويل/قرض/إيداع مالك أو مساهمة رأسمالية.
- تحويل داخلي بين حسابات المصنع.
- إيراد آخر موثق.

لا يصنف القرض أو تحويل المالك أو التحويل الداخلي كإيراد تشغيلي.

## Outflow rules
يحدد لمن ولماذا خرج كل مبلغ، مثل:
- سداد فاتورة مورد أو دفعة مقدمة لمورد.
- شراء خامات أو مصروف مشروع/أمر تصنيع.
- رواتب وأجور ومستحقات موظفين.
- إيجار، خدمات، نقل، صيانة، رسوم بنكية، ضريبة أو زكاة.
- شراء أصل ثابت.
- سداد قرض أو تمويل.
- تحويل داخلي بين حسابات المصنع.
- سحب/توزيع مالك أو بند يحتاج مراجعة.

لا يصنف شراء الأصل أو سداد أصل القرض أو التحويل الداخلي كمصروف ربحي تلقائيًا.

## Matching and reconciliation
1. يطابق transaction أولًا بالمرجع البنكي/رقم الفاتورة/رقم السداد، ثم المبلغ والتاريخ والطرف المقابل.
2. يدعم one-to-one وone-to-many وmany-to-one مع حفظ تفاصيل التجميع.
3. يمنع المطابقة المزدوجة لنفس الحركة البنكية أو لنفس الدفعة إلا في توزيع موثق.
4. يقارن رصيد البنك الدفتري مع كشف البنك ويولد outstanding_items مثل شيكات/تحويلات معلقة أو قيود لم تظهر بعد.
5. يحسب:
   - statement_closing_balance
   - ledger_closing_balance
   - adjusted_bank_balance
   - adjusted_ledger_balance
   - reconciliation_difference
6. يجب أن تكون reconciliation_difference = 0 ضمن tolerance التقريب المعتمد قبل اعتبار الشهر مسوى.

## Monthly outputs
- bank_transactions_ledger: سجل كامل لكل دخول وخروج وسببه والطرف المقابل والحساب المقترح.
- unmatched_inflows وunmatched_outflows.
- duplicate_or_suspicious_transactions.
- bank_reconciliation_statement.
- proposed_journal_entries لمسودة المراجعة فقط.
- monthly_cash_summary:
  opening_bank_balance + total_inflows - total_outflows = closing_bank_balance.
- monthly_profit_summary:
  revenue - cost_of_sales - operating_expenses +/- other_income_expenses = accounting_net_profit.
- cash_vs_profit_bridge يشرح لماذا يختلف صافي التدفق البنكي عن الربح المحاسبي: ذمم، دفعات مقدمة، VAT، أصول، قروض، مساهمات/سحوبات، استهلاك، قيود غير نقدية، وتحويلات داخلية.
- month_over_month مقارنة بالشهر السابق ونسبة التغير.

## Critical accounting rule
كشف البنك مصدر أساسي لتدقيق النقد وليس مصدرًا وحيدًا للربح. لا يجوز تعريف `total_inflows - total_outflows` على أنه صافي ربح. يجب حساب صافي الربح من نظام الاستحقاق والدفتر العام والمبيعات والتكاليف والمصروفات، وعرض صافي الحركة النقدية بصورة مستقلة.

## Anomaly detection
يرفع risk_flags عند:
- حركة كبيرة غير معتادة أو طرف مقابل جديد.
- دفعة مكررة أو مبلغ مطابق لدفع سابق.
- خروج بلا مورد/موظف/جهة مستفيدة واضحة.
- تحويل إلى IBAN غير معتمد مقارنة بسجل المورد.
- دفعة تتجاوز الرصيد المستحق.
- إيداع لا يمكن ربطه بعميل أو مصدر قانوني/محاسبي واضح.
- حركة في عطلة/وقت غير معتاد عند وجود قرائن إضافية.
- رسوم بنكية أو استقطاعات غير مقيدة.
- تعديل يدوي بعد إقفال التسوية الشهرية.

## Proposed journal entries
يمكن اقتراح القيد المحاسبي فقط، مع debit_account / credit_account / amount / VAT treatment / cost_center / project / explanation / source_transaction_id.
لا يرحل أي قيد تلقائيًا. كل قيد مقترح يحتاج مراجعة واعتماد محاسب مخول، ويمر عبر financial-control-agent.

## Dependencies
`smart-expense-coding`, `accounts-receivable-ai`, `accounts-payable-ai`, `detect-financial-anomalies`, `analyze-financial-reports`, `financial-control-agent`.

## Governance
- البيانات مقيدة بـ company_id والحسابات البنكية التابعة له فقط.
- كشف البنك الأصلي يبقى immutable evidence؛ أي تعديل يكون على التصنيف/المطابقة وليس النص الأصلي.
- حفظ hash/metadata للملف المعتمد متى كان متاحًا.
- لا إنشاء دفعة، لا تعديل رصيد بنك، لا ترحيل قيد، ولا إغلاق شهر تلقائيًا.
- الحركات غير المفسرة تبقى `unclassified` ولا يجبر النظام تصنيفًا منخفض الثقة.
- أي override يسجل المستخدم والسبب والقيمة السابقة والجديدة والوقت في audit log.
- إقفال التسوية الشهرية يتطلب reconciliation_difference ضمن tolerance وعدم وجود blocking_issues جوهرية واعتماد مستخدم مخول.
