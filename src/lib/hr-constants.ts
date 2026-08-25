export const EMPLOYMENT_STATUS = {
  active: { ar: "على رأس العمل", en: "Active" },
  probation: { ar: "تحت التجربة", en: "Probation" },
  on_leave: { ar: "في إجازة", en: "On leave" },
  suspended: { ar: "موقوف", en: "Suspended" },
  terminated: { ar: "منتهية خدماته", en: "Terminated" },
  resigned: { ar: "مستقيل", en: "Resigned" },
} as const;

export const CONTRACT_TYPE = {
  permanent: { ar: "غير محدد المدة", en: "Permanent" },
  fixed_term: { ar: "محدد المدة", en: "Fixed term" },
  part_time: { ar: "دوام جزئي", en: "Part time" },
  temporary: { ar: "مؤقت", en: "Temporary" },
  trainee: { ar: "تدريب", en: "Trainee" },
} as const;

export const CONTRACT_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  active: { ar: "ساري", en: "Active" },
  expired: { ar: "منتهي", en: "Expired" },
  terminated: { ar: "منهى", en: "Terminated" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
} as const;

export const ATTENDANCE_STATUS = {
  present: { ar: "حاضر", en: "Present" },
  absent: { ar: "غائب", en: "Absent" },
  late: { ar: "متأخر", en: "Late" },
  on_leave: { ar: "إجازة", en: "On leave" },
  holiday: { ar: "عطلة رسمية", en: "Holiday" },
  weekend: { ar: "راحة أسبوعية", en: "Weekend" },
} as const;

export const LEAVE_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  submitted: { ar: "مقدم", en: "Submitted" },
  approved: { ar: "معتمد", en: "Approved" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
} as const;

export const CUSTODY_STATUS = {
  issued: { ar: "مسلّمة", en: "Issued" },
  returned: { ar: "مستردة", en: "Returned" },
  lost: { ar: "مفقودة", en: "Lost" },
  damaged: { ar: "تالفة", en: "Damaged" },
} as const;

export const PAYROLL_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  calculated: { ar: "محتسبة", en: "Calculated" },
  approved: { ar: "معتمدة", en: "Approved" },
  paid: { ar: "مدفوعة", en: "Paid" },
  cancelled: { ar: "ملغاة", en: "Cancelled" },
} as const;

export const HR_DOC_TYPE = {
  national_id: { ar: "هوية وطنية", en: "National ID" },
  iqama: { ar: "إقامة", en: "Iqama" },
  passport: { ar: "جواز سفر", en: "Passport" },
  visa: { ar: "تأشيرة", en: "Visa" },
  contract: { ar: "عقد", en: "Contract" },
  certificate: { ar: "شهادة", en: "Certificate" },
  medical: { ar: "تقرير طبي", en: "Medical" },
  license: { ar: "رخصة", en: "License" },
  other: { ar: "أخرى", en: "Other" },
} as const;

const ERRORS: Record<string, { ar: string; en: string }> = {
  NO_COMPANY: { ar: "لا توجد منشأة مرتبطة بالحساب", en: "No company linked to this account" },
  FORBIDDEN_ROLE: { ar: "لا تملك صلاحية تنفيذ هذا الإجراء", en: "You are not allowed to perform this action" },
  FORBIDDEN_HR: { ar: "هذا الإجراء مقصور على الموارد البشرية", en: "HR staff only" },
  FORBIDDEN_PAYROLL: { ar: "هذا الإجراء مقصور على مسؤولي الرواتب", en: "Payroll staff only" },
  FORBIDDEN_LEAVE_APPROVAL: { ar: "اعتماد الإجازة مقصور على المدير أو الموارد البشرية", en: "Only the manager or HR can approve leave" },
  FORBIDDEN_PAYROLL_APPROVAL: { ar: "اعتماد الرواتب مقصور على المخوّلين", en: "Payroll approval is restricted" },
  EMPLOYEE_NOT_FOUND: { ar: "الموظف غير موجود", en: "Employee not found" },
  CONTRACT_OVERLAP: { ar: "يوجد عقد ساري متداخل لنفس الموظف", en: "An overlapping active contract already exists" },
  CONTRACT_END_BEFORE_START: { ar: "تاريخ نهاية العقد يجب أن يكون بعد البداية", en: "Contract end must be after start" },
  CONTRACT_END_REQUIRED: { ar: "العقد محدد المدة يتطلب تاريخ نهاية", en: "Fixed-term contract requires an end date" },
  CONTRACT_LOCKED: { ar: "لا يمكن تعديل عقد ساري أو منتهٍ", en: "Active/closed contract cannot be edited" },
  SALARY_NEGATIVE: { ar: "الراتب لا يمكن أن يكون سالبًا", en: "Salary cannot be negative" },
  SHIFT_ASSIGNMENT_OVERLAP: { ar: "يوجد إسناد وردية متداخل", en: "Overlapping shift assignment" },
  ASSIGNMENT_END_BEFORE_START: { ar: "نهاية الإسناد قبل بدايته", en: "Assignment end before start" },
  CHECKOUT_BEFORE_CHECKIN: { ar: "وقت الانصراف قبل الحضور", en: "Check-out before check-in" },
  MANUAL_REASON_REQUIRED: { ar: "التعديل اليدوي يتطلب ذكر السبب", en: "Manual entry requires a reason" },
  LEAVE_OVERLAP: { ar: "يوجد طلب إجازة متداخل", en: "Overlapping leave request" },
  LEAVE_BALANCE_EXCEEDED: { ar: "الرصيد المتاح لا يكفي", en: "Leave balance exceeded" },
  LEAVE_BALANCE_NOT_SET: { ar: "لم يتم تعريف رصيد الإجازة لهذه السنة", en: "Leave balance is not defined for this year" },
  LEAVE_END_BEFORE_START: { ar: "نهاية الإجازة قبل بدايتها", en: "Leave end before start" },
  LEAVE_DAYS_MUST_BE_POSITIVE: { ar: "عدد أيام الإجازة يجب أن يكون أكبر من صفر", en: "Leave days must be positive" },
  CUSTODY_RETURN_BEFORE_ISSUE: { ar: "تاريخ الاسترداد قبل التسليم", en: "Return date before issue date" },
  PAYROLL_RUN_LOCKED: { ar: "تشغيل الرواتب معتمد ولا يمكن تعديله", en: "Approved payroll run is immutable" },
  PAYROLL_RUN_EMPTY: { ar: "لا توجد بنود في تشغيل الرواتب", en: "Payroll run has no items" },
  PAYROLL_RUN_UNBALANCED: { ar: "تشغيل الرواتب غير متوازن", en: "Payroll run is unbalanced" },
  PAYROLL_RUN_EXISTS: { ar: "يوجد تشغيل رواتب لهذه الفترة", en: "A payroll run already exists for this period" },
  PAYROLL_ACCOUNTS_NOT_CONFIGURED: { ar: "حسابات الرواتب غير مهيأة في الإعدادات", en: "Payroll accounts are not configured" },
  PAYROLL_ALREADY_POSTED: { ar: "تم ترحيل هذا التشغيل مسبقًا", en: "This run is already posted" },
  PAYROLL_NOT_APPROVED: { ar: "يجب اعتماد التشغيل قبل الترحيل", en: "Approve the run before posting" },
  NET_PAY_NEGATIVE: { ar: "صافي الراتب سالب", en: "Net pay is negative" },
  NO_ELIGIBLE_EMPLOYEES: { ar: "لا يوجد موظفون بعقود سارية في هذه الفترة", en: "No employees with active contracts in this period" },
  PERIOD_CLOSED: { ar: "الفترة مقفلة", en: "Period is closed" },
  POSTING_DUPLICATE: { ar: "القيد مرحّل مسبقًا لهذا المصدر", en: "Entry already posted for this source" },
  ENTRY_NOT_BALANCED: { ar: "القيد غير متوازن", en: "Entry is not balanced" },
};

export function hrErrorText(code: string, ar: boolean) {
  const key = Object.keys(ERRORS).find((k) => code.includes(k));
  if (key) return ar ? ERRORS[key]!.ar : ERRORS[key]!.en;
  return ar ? "تعذر تنفيذ العملية" : "The operation could not be completed";
}

