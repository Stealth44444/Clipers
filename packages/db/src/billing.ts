// Brand billing: what a brand deposits for a campaign (the service amount plus VAT, which the terms state separately)
// and the details Clipers needs to issue the tax invoice. Policy notes: docs/legal/README.md section 5.

/** VAT on the service amount, cut to the won (부가가치세 별도 — provisional, see docs/legal/README.md). */
export function vatOn(serviceAmount: number): number {
  return Math.floor(Math.max(0, serviceAmount) / 10);
}

/** The amount a brand transfers for a campaign: its service amount plus VAT. */
export function depositAmount(serviceAmount: number): number {
  return Math.max(0, serviceAmount) + vatOn(serviceAmount);
}

/** Korean business registration number check digit (10 digits, weights 1 3 7 1 3 7 1 3 5). */
export function isBusinessNumber(value: string): boolean {
  const digits = value.replace(/-/g, '');
  if (!/^\d{10}$/.test(digits)) return false;
  const d = [...digits].map(Number);
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  const sum = weights.reduce((total, weight, index) => total + d[index] * weight, 0) + Math.floor((d[8] * 5) / 10);
  return (10 - (sum % 10)) % 10 === d[9];
}

export type BillingProfileInput = { businessNumber: string; companyName: string; representative: string; invoiceEmail: string };
export type BillingProfile = BillingProfileInput;

/** Checks and normalises a brand's tax invoice details (business number as digits only). */
export function validateBillingProfile(input: BillingProfileInput): { ok: true; data: BillingProfile } | { ok: false; message: string } {
  const businessNumber = input.businessNumber.replace(/[\s-]/g, '');
  const companyName = input.companyName.trim();
  const representative = input.representative.trim();
  const invoiceEmail = input.invoiceEmail.trim();

  if (!isBusinessNumber(businessNumber)) return { ok: false, message: '사업자등록번호 10자리를 확인해 주세요.' };
  if (!companyName || companyName.length > 100) return { ok: false, message: '상호를 입력해 주세요.' };
  if (!representative || representative.length > 40) return { ok: false, message: '대표자 이름을 입력해 주세요.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoiceEmail) || invoiceEmail.length > 200) {
    return { ok: false, message: '세금계산서를 받을 이메일을 확인해 주세요.' };
  }
  return { ok: true, data: { businessNumber, companyName, representative, invoiceEmail } };
}

/** 544-87-03492 style. */
export function formatBusinessNumber(digits: string): string {
  return digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}` : digits;
}
