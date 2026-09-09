import { describe, expect, it } from 'vitest'
import { evaluateCreditRelease, evaluateSmartLawyerText } from './smart-lawyer.constants'

describe('smart lawyer v0.2 rules', () => {
  it('blocks credit release when exposure exceeds limit', () => {
    const result = evaluateCreditRelease({
      orderValue: 70_000,
      outstanding: 40_000,
      creditLimit: 100_000,
      guaranteesOk: true,
      overdueBlock: false,
    })
    expect(result.status).toBe('blocked')
    expect(result.totalExposure).toBe(110_000)
  })

  it('flags credit days above the default 60-day policy', () => {
    const result = evaluateSmartLawyerText('يتم السداد بعد 90 يوم من تاريخ التسليم مع ضمان لمدة سنة.')
    expect(result.findings.some((finding) => finding.type === 'policy_conflict')).toBe(true)
    expect(result.riskScore).toBeGreaterThan(0)
  })

  it('requires no extra approval for a complete low-risk sample', () => {
    const result = evaluateSmartLawyerText(
      'شروط الدفع: دفعة مقدمة. التسليم والاستلام بمحضر. الضمان 12 شهر. القوة القاهرة. حل النزاعات والاختصاص في الرياض. التوقيع من مخول بموجب تفويض.',
    )
    expect(result.riskLevel).toBe('low')
    expect(result.requiredApprovals).toEqual([])
  })
})
