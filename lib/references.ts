export const REF_PREFIX = {
  job: 'J',
  quote: 'Q',
  invoice: 'INV',
} as const;

/** Client-side reference: PREFIX + last 6 chars of base-36 timestamp (e.g. Q-A1B2C3). */
export function generateReference(prefix: string): string {
  const n = Date.now().toString(36).toUpperCase();
  return `${prefix}-${n.slice(-6)}`;
}

export function generateJobReference(): string {
  return generateReference(REF_PREFIX.job);
}

export function generateQuoteReference(): string {
  return generateReference(REF_PREFIX.quote);
}

export function generateInvoiceReference(): string {
  return generateReference(REF_PREFIX.invoice);
}
