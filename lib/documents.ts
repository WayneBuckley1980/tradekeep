import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';

import { formatMoney } from '@/lib/money';
import type { Customer, Profile } from '@/types/database';

export type DocumentType = 'Quote' | 'Invoice' | 'Receipt';

export type DocumentLineItem = {
  label: string;
  amount: number;
};

export type DocumentDetails = {
  type: DocumentType;
  reference: string;
  title: string;
  date: string;
  lineItems: DocumentLineItem[];
  subtotal: number;
  total: number;
  notes?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatBusinessAddress(profile: Profile): string {
  return [
    profile.business_name,
    profile.business_address_line1,
    profile.business_address_line2,
    profile.business_city,
    profile.business_postcode,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildDocumentHtml(
  profile: Profile,
  client: Customer,
  doc: DocumentDetails,
): string {
  const businessAddress = escapeHtml(formatBusinessAddress(profile) || 'Your business address');
  const clientName = escapeHtml(client.name);
  const rows = doc.lineItems
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.label)}</td><td style="text-align:right">${escapeHtml(formatMoney(item.amount))}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 40px; font-size: 14px; }
  .header { position: relative; min-height: 90px; margin-bottom: 32px; }
  .brand { font-size: 22px; font-weight: 700; }
  .address { position: absolute; top: 0; right: 0; text-align: right; white-space: pre-line; font-size: 12px; color: #444; max-width: 45%; }
  .meta { color: #666; margin-bottom: 24px; }
  .greeting { margin-bottom: 20px; font-size: 15px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border-bottom: 1px solid #ddd; padding: 10px 4px; text-align: left; }
  th { font-size: 12px; text-transform: uppercase; color: #666; }
  .totals { margin-top: 20px; text-align: right; font-size: 16px; font-weight: 700; }
  .notes { margin-top: 24px; color: #555; white-space: pre-wrap; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">${escapeHtml(profile.business_name ?? 'TradeKeepCRM')}</div>
    <div class="address">${businessAddress}</div>
  </div>
  <div class="meta">
    <div><strong>${escapeHtml(doc.type)}</strong> ${escapeHtml(doc.reference)}</div>
    <div>${escapeHtml(doc.title)}</div>
    <div>Date: ${escapeHtml(doc.date)}</div>
  </div>
  <div class="greeting"><p>Dear <strong>${clientName}</strong>,</p></div>
  <p>Please find your ${escapeHtml(doc.type.toLowerCase())} details below.</p>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">Total: ${escapeHtml(formatMoney(doc.total))}</div>
  ${doc.notes ? `<div class="notes">${escapeHtml(doc.notes)}</div>` : ''}
</body>
</html>`;
}

export async function generateDocumentPdf(
  profile: Profile,
  client: Customer,
  doc: DocumentDetails,
): Promise<string> {
  const html = buildDocumentHtml(profile, client, doc);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}

function subjectFor(profile: Profile, docType: DocumentType, reference: string): string {
  const business = profile.business_name ?? 'TradeKeepCRM';
  return `${business} — ${docType} ${reference}`;
}

function bodyFor(docType: DocumentType, clientName: string): string {
  const lines: Record<DocumentType, string> = {
    Quote: `Dear ${clientName},\n\nPlease find attached your quote. Let us know if you would like to go ahead.\n\nKind regards`,
    Invoice: `Dear ${clientName},\n\nPlease find attached your invoice. Payment details are included in the document.\n\nKind regards`,
    Receipt: `Dear ${clientName},\n\nThank you for your payment. Please find your receipt attached.\n\nKind regards`,
  };
  return lines[docType];
}

export async function emailDocumentPdf(
  clientEmail: string | null | undefined,
  profile: Profile,
  docType: DocumentType,
  reference: string,
  pdfUri: string,
  clientName: string,
): Promise<boolean> {
  if (!clientEmail?.trim()) {
    throw new Error('This client has no email address. Add an email on the client record first.');
  }

  const available = await MailComposer.isAvailableAsync();
  if (!available) {
    throw new Error('Email is not available on this device.');
  }

  await MailComposer.composeAsync({
    recipients: [clientEmail.trim()],
    subject: subjectFor(profile, docType, reference),
    body: bodyFor(docType, clientName),
    attachments: [pdfUri],
  });

  return true;
}

export async function generateAndEmailDocument(
  profile: Profile,
  client: Customer,
  doc: DocumentDetails,
): Promise<string> {
  const pdfUri = await generateDocumentPdf(profile, client, doc);
  await emailDocumentPdf(client.email, profile, doc.type, doc.reference, pdfUri, client.name);
  return pdfUri;
}
