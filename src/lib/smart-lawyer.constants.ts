export const SMART_LAWYER_DEFAULT_POLICY = {
  maxCreditDays: 60,
  minAdvancePercent: 30,
  defaultWarrantyMonths: 60,
  extraReviewValue: 500_000,
  mandatoryClauses: [
    'التسليم والاستلام',
    'شروط الدفع',
    'الضمان',
    'التأخير والقوة القاهرة',
    'حل النزاعات والاختصاص',
    'صلاحية التوقيع',
  ],
} as const

export type SmartLawyerRiskLevel = 'low' | 'medium' | 'high'

export type SmartLawyerFinding = {
  type: 'missing_clause' | 'policy_conflict' | 'risk_keyword'
  clause: string
  severity: 'medium' | 'high'
  detail?: string
}

export function evaluateSmartLawyerText(text: string) {
  const t = text || ''
  const findings: SmartLawyerFinding[] = []
  let score = 0

  const rules: Array<[string, RegExp[], number]> = [
    ['شروط الدفع', [/دفع/i, /سداد/i, /دفعة/i], 12],
    ['التسليم والاستلام', [/تسليم/i, /استلام/i], 12],
    ['الضمان', [/ضمان/i], 10],
    ['القوة القاهرة', [/قوة قاهرة/i, /القوة القاهرة/i], 8],
    ['حل النزاعات', [/نزاع/i, /اختصاص/i, /محكم/i], 10],
    ['صلاحية التوقيع', [/مخول/i, /تفويض/i, /توقيع/i], 8],
  ]

  for (const [name, patterns, points] of rules) {
    if (!patterns.some((pattern) => pattern.test(t))) {
      findings.push({ type: 'missing_clause', clause: name, severity: 'medium' })
      score += points
    }
  }

  const dayMatches = [...t.matchAll(/(\d{2,3})\s*(?:يوم|يوماً|يومًا)/g)]
    .map((match) => Number(match[1]))
    .filter(Number.isFinite)
  const maxDays = dayMatches.length ? Math.max(...dayMatches) : 0
  if (maxDays > SMART_LAWYER_DEFAULT_POLICY.maxCreditDays) {
    findings.push({
      type: 'policy_conflict',
      clause: 'مدة السداد',
      severity: 'high',
      detail: `ورد أجل ${maxDays} يوم بينما السياسة الافتراضية ${SMART_LAWYER_DEFAULT_POLICY.maxCreditDays} يوم.`,
    })
    score += 25
  }

  const riskyKeywords: Record<string, number> = {
    غرامة: 8,
    تعويض: 8,
    فسخ: 7,
    إلغاء: 6,
    حصري: 7,
    'غير قابل للإلغاء': 10,
    'مسؤولية غير محدودة': 20,
  }
  for (const [keyword, points] of Object.entries(riskyKeywords)) {
    if (t.includes(keyword)) {
      findings.push({ type: 'risk_keyword', clause: keyword, severity: 'medium' })
      score += points
    }
  }

  score = Math.min(score, 100)
  const riskLevel: SmartLawyerRiskLevel = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low'

  return {
    summary: 'تحليل آلي أولي للمستند مقابل سياسات الشركة والقواعد التشغيلية.',
    riskScore: score,
    riskLevel,
    findings,
    requiredApprovals:
      riskLevel === 'high'
        ? ['مدير المنصة', 'المراجعة القانونية']
        : riskLevel === 'medium'
          ? ['المراجعة القانونية']
          : [],
  }
}

export function evaluateCreditRelease(input: {
  orderValue: number
  outstanding: number
  creditLimit: number
  guaranteesOk: boolean
  overdueBlock: boolean
}) {
  const totalExposure = input.orderValue + input.outstanding
  const reasons: string[] = []
  if (input.overdueBlock) reasons.push('يوجد إيقاف بسبب متأخرات')
  if (!input.guaranteesOk) reasons.push('الضمانات غير مكتملة')
  if (totalExposure > input.creditLimit) reasons.push('التعرض الائتماني يتجاوز الحد المعتمد')

  return {
    status: reasons.length ? 'blocked' : 'eligible_for_approval',
    totalExposure,
    reasons,
  } as const
}
