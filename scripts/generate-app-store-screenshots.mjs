import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_IPHONE = path.join(ROOT, 'app-store-screenshots', 'iphone');
const OUT_IPAD = path.join(ROOT, 'app-store-screenshots', 'ipad');

const C = {
  background: '#2A2A2A',
  surface: '#363636',
  surfaceElevated: '#424242',
  textPrimary: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textMuted: '#8E8E93',
  borderSubtle: 'rgba(255,255,255,0.18)',
  ctaBackground: '#FFFFFF',
  ctaText: '#2A2A2A',
  statusPaid: '#34C759',
  statusUpcoming: '#0A84FF',
  statusWaiting: '#FF9F0A',
  statusOverdue: '#FF453A',
  canvasTop: '#1E1E1E',
  canvasBottom: '#2A2A2A',
  frameOuter: '#0A0A0A',
  frameBezel: '#1C1C1E',
};

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function font(size, weight = 400) {
  return `font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}"`;
}

function roundedRect(x, y, w, h, r, fill, stroke, strokeWidth = 1) {
  const strokeAttr = stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}"${strokeAttr}/>`;
}

function text(x, y, content, size, color, weight = 400, anchor = 'start', extra = '') {
  return `<text x="${x}" y="${y}" fill="${color}" ${font(size, weight)} text-anchor="${anchor}" ${extra}>${esc(content)}</text>`;
}

function card(x, y, w, h, r = 12) {
  return roundedRect(x, y, w, h, r, C.surface, C.borderSubtle);
}

function statusBadge(x, y, label, color) {
  const padX = 10;
  const padY = 6;
  const w = label.length * 7.5 + padX * 2;
  const h = 24;
  return `
    ${roundedRect(x, y, w, h, 8, color + '33', color, 1)}
    ${text(x + padX, y + 16, label, 11, color, 600)}
  `;
}

function tabBar(x, y, w, tabs, activeIndex, scale) {
  const h = 72 * scale;
  const tabW = w / tabs.length;
  let svg = roundedRect(x, y, w, h, 0, C.background, C.borderSubtle, 1);
  tabs.forEach((tab, i) => {
    const tx = x + i * tabW;
    const active = i === activeIndex;
    svg += text(tx + tabW / 2, y + 44 * scale, tab, 13 * scale, active ? C.textPrimary : C.textMuted, active ? 600 : 400, 'middle');
    if (active) {
      svg += `<rect x="${tx + tabW * 0.2}" y="${y + h - 3}" width="${tabW * 0.6}" height="3" fill="${C.textPrimary}"/>`;
    }
  });
  return svg;
}

function appHeader(x, y, w, title, scale) {
  const h = 88 * scale;
  let svg = roundedRect(x, y, w, h, 0, C.background, C.borderSubtle, 1);
  svg += text(x + w / 2, y + 56 * scale, title, 28 * scale, C.textPrimary, 700, 'middle');
  return svg;
}

function statusBar(x, y, w, scale) {
  const h = 44 * scale;
  const time = text(x + 24 * scale, y + 28 * scale, '9:41', 15 * scale, C.textPrimary, 600);
  const icons = `<g fill="${C.textPrimary}">
    <rect x="${x + w - 72 * scale}" y="${y + 16 * scale}" width="18" height="12" rx="2" opacity="0.9"/>
    <rect x="${x + w - 48 * scale}" y="${y + 14 * scale}" width="16" height="14" rx="2" opacity="0.9"/>
    <rect x="${x + w - 26 * scale}" y="${y + 12 * scale}" width="22" height="16" rx="3" opacity="0.9"/>
  </g>`;
  return roundedRect(x, y, w, h, 0, C.background, 'none') + time + icons;
}

function searchBar(x, y, w, placeholder, scale) {
  const h = 44 * scale;
  return `
    ${roundedRect(x, y, w, h, 10 * scale, C.surfaceElevated, C.borderSubtle)}
    ${text(x + 16 * scale, y + 28 * scale, placeholder, 15 * scale, C.textMuted)}
  `;
}

function customerRow(x, y, w, name, subtitle, meta, scale) {
  const h = 88 * scale;
  let svg = card(x, y, w, h, 12 * scale);
  svg += text(x + 16 * scale, y + 32 * scale, name, 17 * scale, C.textPrimary, 600);
  if (subtitle) svg += text(x + 16 * scale, y + 54 * scale, subtitle, 13 * scale, C.textSecondary);
  if (meta) svg += text(x + w - 16 * scale, y + 32 * scale, meta, 13 * scale, C.textMuted, 400, 'end');
  return svg;
}

function workflowTabs(x, y, w, tabs, activeIndex, scale) {
  const h = 52 * scale;
  let svg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.background}"/>`;
  svg += `<line x1="${x}" y1="${y + h}" x2="${x + w}" y2="${y + h}" stroke="${C.borderSubtle}" stroke-width="1"/>`;
  const tabW = w / tabs.length;
  tabs.forEach((tab, i) => {
    const active = i === activeIndex;
    const tx = x + i * tabW;
    const cx = tx + tabW / 2;
    svg += text(cx, y + 32 * scale, tab.label, 11 * scale, active ? C.textPrimary : C.textMuted, active ? 600 : 400, 'middle');
    if (tab.count) {
      const bx = cx + tab.label.length * 3.2 + 4;
      svg += roundedRect(bx, y + 14 * scale, 18, 16, 8, C.surfaceElevated, 'none');
      svg += text(bx + 9, y + 26 * scale, String(tab.count), 10 * scale, C.textPrimary, 700, 'middle');
    }
    if (active) {
      svg += `<rect x="${tx + tabW * 0.15}" y="${y + h - 2}" width="${tabW * 0.7}" height="2" fill="${C.textPrimary}"/>`;
    }
  });
  return svg;
}

function workflowCard(x, y, w, title, subtitle, meta, statusLabel, statusColor, scale) {
  const h = 96 * scale;
  let svg = card(x, y, w, h, 12 * scale);
  svg += text(x + 16 * scale, y + 30 * scale, title, 16 * scale, C.textPrimary, 600);
  if (statusLabel) svg += statusBadge(x + w - 16 - statusLabel.length * 7 - 20, y + 12 * scale, statusLabel, statusColor);
  if (subtitle) svg += text(x + 16 * scale, y + 52 * scale, subtitle, 13 * scale, C.textSecondary);
  if (meta) svg += text(x + 16 * scale, y + 74 * scale, meta, 12 * scale, C.textMuted);
  return svg;
}

function statCard(x, y, w, label, value, valueColor, scale) {
  const h = 96 * scale;
  let svg = card(x, y, w, h, 12 * scale);
  svg += text(x + 16 * scale, y + 32 * scale, label, 13 * scale, C.textSecondary);
  svg += text(x + 16 * scale, y + 68 * scale, value, 28 * scale, valueColor || C.textPrimary, 700);
  return svg;
}

function lineItemRow(x, y, w, label, amount, scale) {
  const h = 52 * scale;
  let svg = roundedRect(x, y, w, h, 8 * scale, C.surfaceElevated, C.borderSubtle);
  svg += text(x + 12 * scale, y + 32 * scale, label, 15 * scale, C.textPrimary);
  svg += text(x + w - 12 * scale, y + 32 * scale, amount, 15 * scale, C.textPrimary, 600, 'end');
  return svg;
}

function ctaButton(x, y, w, label, scale, primary = true) {
  const h = 48 * scale;
  const fill = primary ? C.ctaBackground : C.surfaceElevated;
  const color = primary ? C.ctaText : C.textPrimary;
  const stroke = primary ? 'none' : C.borderSubtle;
  return `
    ${roundedRect(x, y, w, h, 12 * scale, fill, stroke)}
    ${text(x + w / 2, y + 30 * scale, label, 15 * scale, color, 700, 'middle')}
  `;
}

function segmentTabs(x, y, w, tabs, activeIndex, scale) {
  const gap = 8 * scale;
  const tabW = (w - gap * (tabs.length - 1)) / tabs.length;
  let svg = '';
  tabs.forEach((tab, i) => {
    const tx = x + i * (tabW + gap);
    const active = i === activeIndex;
    svg += roundedRect(tx, y, tabW, 40 * scale, 10 * scale, active ? C.surfaceElevated : 'transparent', active ? C.textPrimary : C.borderSubtle, active ? 2 : 1);
    svg += text(tx + tabW / 2, y + 26 * scale, tab, 14 * scale, C.textPrimary, 600, 'middle');
  });
  return svg;
}

function businessTypeRow(x, y, w, icon, label, selected, scale) {
  const h = 44 * scale;
  let svg = '';
  if (selected) svg += roundedRect(x, y, w, h, 8 * scale, C.surfaceElevated, C.textPrimary, 1);
  svg += text(x + 12 * scale, y + 28 * scale, icon, 18 * scale, C.textPrimary);
  svg += text(x + 44 * scale, y + 28 * scale, label, 15 * scale, selected ? C.textPrimary : C.textSecondary, selected ? 600 : 400);
  return svg;
}

function bottomTabBar(x, y, w, h, s, tabs, activeIndex) {
  return tabBar(x, y + h - 72 * s, w, tabs, activeIndex, s);
}

const SCREENS = {
  home: {
    headline: 'Manage every client in one place',
    subtitle: 'Clients, leads and follow-ups — organised.',
    render: (x, y, w, h, s) => {
      let svg = appHeader(x, y, w, 'TradeKeepCRM', s);
      const cy = y + 88 * s;
      svg += `<rect x="${x}" y="${cy}" width="${w}" height="${36 * s}" fill="${C.background}"/>`;
      svg += text(x + 16 * s, cy + 14 * s, 'Business type', 12 * s, C.textMuted);
      svg += roundedRect(x + 16 * s, cy + 20 * s, w - 32 * s, 36 * s, 8 * s, C.surfaceElevated, C.borderSubtle);
      svg += text(x + 28 * s, cy + 44 * s, '🔧  Trades & Contractors', 14 * s, C.textPrimary, 500);
      const ty = cy + 68 * s;
      svg += segmentTabs(x + 16 * s, ty, w - 32 * s, ['Clients', 'Leads (3)'], 0, s);
      const sy = ty + 52 * s;
      svg += searchBar(x + 16 * s, sy, w - 32 * s, 'Search clients, leads…', s);
      svg += text(x + 16 * s, sy + 60 * s, 'ACTIVE', 13 * s, C.textSecondary, 500);
      let ry = sy + 80 * s;
      svg += customerRow(x + 16 * s, ry, w - 32 * s, 'Sarah Mitchell', 'Kitchen renovation', 'Follow-up Fri', s);
      ry += 96 * s;
      svg += customerRow(x + 16 * s, ry, w - 32 * s, 'James Turner', 'Bathroom refit', '', s);
      ry += 96 * s;
      svg += text(x + 16 * s, ry, 'RECENT', 13 * s, C.textSecondary, 500);
      ry += 24 * s;
      svg += customerRow(x + 16 * s, ry, w - 32 * s, 'Emma Wilson', 'Boiler service', 'Paid', s);
      ry += 96 * s;
      svg += customerRow(x + 16 * s, ry, w - 32 * s, 'David Chen', 'Fence repair', '', s);
      svg += bottomTabBar(x, y, w, h, s, ['Home', 'Jobs', 'Money', 'More'], 0);
      return svg;
    },
  },
  workspace: {
    headline: 'Track every job from quote to close',
    subtitle: 'One workspace per client — quotes, work, invoices.',
    render: (x, y, w, h, s) => {
      let svg = statusBar(x, y, w, s);
      const hy = y + 44 * s;
      svg += `<rect x="${x}" y="${hy}" width="${w}" height="${56 * s}" fill="${C.background}"/>`;
      svg += text(x + 16 * s, hy + 36 * s, '← Sarah Mitchell', 17 * s, C.textPrimary, 600);
      const ny = hy + 56 * s;
      svg += text(x + 16 * s, ny + 36 * s, 'Sarah Mitchell', 24 * s, C.textPrimary, 700);
      svg += roundedRect(x + 16 * s, ny + 48 * s, 72 * s, 32 * s, 8 * s, C.surfaceElevated, C.borderSubtle);
      svg += text(x + 52 * s, ny + 68 * s, '📞 Call', 12 * s, C.textPrimary, 600, 'middle');
      svg += roundedRect(x + 96 * s, ny + 48 * s, 72 * s, 32 * s, 8 * s, C.surfaceElevated, C.borderSubtle);
      svg += text(x + 132 * s, ny + 68 * s, '✉️ Email', 12 * s, C.textPrimary, 600, 'middle');
      const wy = ny + 96 * s;
      svg += workflowTabs(x, wy, w, [
        { label: 'Quote', count: 2 },
        { label: 'Order agreed', count: 1 },
        { label: 'Work completed', count: 0 },
        { label: 'Invoice raised', count: 1 },
        { label: 'Job closed', count: 0 },
      ], 0, s);
      let cy = wy + 64 * s;
      svg += workflowCard(x + 16 * s, cy, w - 32 * s, 'Kitchen renovation', 'Full refit incl. units & worktops', '12 Mar 2026 · £4,850.00', 'Sent', C.statusUpcoming, s);
      cy += 104 * s;
      svg += workflowCard(x + 16 * s, cy, w - 32 * s, 'Bathroom tap repair', 'Replace mixer tap & flexi hoses', '28 Feb 2026 · £180.00', 'Accepted', C.statusPaid, s);
      cy += 120 * s;
      svg += ctaButton(x + 16 * s, cy, w - 32 * s, '+ New job', s);
      cy += 56 * s;
      svg += roundedRect(x + 16 * s, cy, (w - 40 * s) / 2, 44 * s, 12 * s, C.surfaceElevated, C.borderSubtle);
      svg += text(x + 16 * s + (w - 40 * s) / 4, cy + 28 * s, '+ Quote', 13 * s, C.textPrimary, 600, 'middle');
      svg += roundedRect(x + 24 * s + (w - 40 * s) / 2, cy, (w - 40 * s) / 2, 44 * s, 12 * s, C.surfaceElevated, C.borderSubtle);
      svg += text(x + 24 * s + (w - 40 * s) * 0.75, cy + 28 * s, '+ Invoice', 13 * s, C.textPrimary, 600, 'middle');
      return svg;
    },
  },
  quote: {
    headline: 'Build quotes with line items in seconds',
    subtitle: 'Itemised pricing, discounts and professional references.',
    render: (x, y, w, _h, s) => {
      let svg = statusBar(x, y, w, s);
      const hy = y + 44 * s;
      svg += `<rect x="${x}" y="${hy}" width="${w}" height="${56 * s}" fill="${C.background}"/>`;
      svg += text(x + w / 2, hy + 36 * s, 'New quote', 17 * s, C.textPrimary, 600, 'middle');
      let cy = hy + 72 * s;
      svg += text(x + 16 * s, cy, 'Client', 13 * s, C.textMuted);
      cy += 8 * s;
      svg += roundedRect(x + 16 * s, cy, w - 32 * s, 44 * s, 8 * s, C.surfaceElevated, C.borderSubtle);
      svg += text(x + 28 * s, cy + 28 * s, 'Sarah Mitchell', 16 * s, C.textPrimary);
      cy += 56 * s;
      svg += text(x + 16 * s, cy, 'Title', 13 * s, C.textMuted);
      cy += 8 * s;
      svg += roundedRect(x + 16 * s, cy, w - 32 * s, 44 * s, 8 * s, C.surfaceElevated, C.borderSubtle);
      svg += text(x + 28 * s, cy + 28 * s, 'Kitchen tap replacement', 16 * s, C.textPrimary);
      cy += 56 * s;
      svg += text(x + 16 * s, cy, 'Line items', 13 * s, C.textSecondary, 600);
      cy += 16 * s;
      svg += lineItemRow(x + 16 * s, cy, w - 32 * s, 'Labour (2 hrs)', '£120.00', s);
      cy += 60 * s;
      svg += lineItemRow(x + 16 * s, cy, w - 32 * s, 'Mixer tap & flexi hoses', '£85.00', s);
      cy += 60 * s;
      svg += lineItemRow(x + 16 * s, cy, w - 32 * s, 'Disposal & testing', '£25.00', s);
      cy += 72 * s;
      svg += roundedRect(x + 16 * s, cy, w - 32 * s, 44 * s, 8 * s, C.surface, C.borderSubtle);
      svg += text(x + 28 * s, cy + 28 * s, 'Discount', 15 * s, C.textSecondary);
      svg += text(x + w - 28 * s, cy + 28 * s, '£0.00', 15 * s, C.textPrimary, 600, 'end');
      cy += 56 * s;
      svg += roundedRect(x + 16 * s, cy, w - 32 * s, 52 * s, 12 * s, C.surfaceElevated, C.textPrimary, 2);
      svg += text(x + 28 * s, cy + 34 * s, 'Total', 15 * s, C.textSecondary);
      svg += text(x + w - 28 * s, cy + 34 * s, '£230.00', 22 * s, C.textPrimary, 700, 'end');
      cy += 68 * s;
      svg += ctaButton(x + 16 * s, cy, w - 32 * s, 'Save quote', s);
      return svg;
    },
  },
  money: {
    headline: 'Stay on top of invoices and cash flow',
    subtitle: 'Outstanding balances, payments and averages at a glance.',
    render: (x, y, w, h, s) => {
      let svg = appHeader(x, y, w, 'Money', s);
      const cy = y + 88 * s;
      svg += segmentTabs(x + 16 * s, cy + 8 * s, w - 32 * s, ['Overview', 'Quotes', 'Invoices', 'Payments'], 0, s);
      let sy = cy + 64 * s;
      const half = (w - 40 * s) / 2;
      svg += statCard(x + 16 * s, sy, half, 'Outstanding', '£2,340.00', C.statusOverdue, s);
      svg += statCard(x + 24 * s + half, sy, half, 'Paid this month', '£8,750.00', C.statusPaid, s);
      sy += 104 * s;
      svg += statCard(x + 16 * s, sy, half, 'Paid this year', '£42,180.00', C.textPrimary, s);
      svg += statCard(x + 24 * s + half, sy, half, 'Average job value', '£385.00', C.textPrimary, s);
      sy += 120 * s;
      svg += text(x + 16 * s, sy, 'RECENT INVOICES', 13 * s, C.textSecondary, 500);
      sy += 24 * s;
      svg += workflowCard(x + 16 * s, sy, w - 32 * s, 'INV-2026-0142', 'Sarah Mitchell · Kitchen renovation', 'Due 15 Mar 2026 · £4,850.00', 'Overdue', C.statusOverdue, s);
      sy += 104 * s;
      svg += workflowCard(x + 16 * s, sy, w - 32 * s, 'INV-2026-0138', 'Emma Wilson · Boiler service', 'Paid 1 Mar 2026 · £165.00', 'Paid', C.statusPaid, s);
      svg += bottomTabBar(x, y, w, h, s, ['Home', 'Jobs', 'Money', 'More'], 2);
      return svg;
    },
  },
  leads: {
    headline: 'Turn enquiries into loyal clients',
    subtitle: 'Capture leads and convert them with one tap.',
    render: (x, y, w, h, s) => {
      let svg = appHeader(x, y, w, 'TradeKeepCRM', s);
      const cy = y + 88 * s;
      svg += `<rect x="${x}" y="${cy}" width="${w}" height="${36 * s}" fill="${C.background}"/>`;
      svg += text(x + 16 * s, cy + 14 * s, 'Business type', 12 * s, C.textMuted);
      svg += roundedRect(x + 16 * s, cy + 20 * s, w - 32 * s, 36 * s, 8 * s, C.surfaceElevated, C.borderSubtle);
      svg += text(x + 28 * s, cy + 44 * s, '🦮  Dog Walker', 14 * s, C.textPrimary, 500);
      const ty = cy + 68 * s;
      svg += segmentTabs(x + 16 * s, ty, w - 32 * s, ['Clients', 'Leads (3)'], 1, s);
      const sy = ty + 52 * s;
      svg += searchBar(x + 16 * s, sy, w - 32 * s, 'Search clients, leads…', s);
      let ry = sy + 60 * s;
      svg += ctaButton(x + 16 * s, ry, w - 32 * s, '+ New lead', s);
      ry += 64 * s;
      svg += card(x + 16 * s, ry, w - 32 * s, 120 * s, 12 * s);
      svg += text(x + 28 * s, ry + 32 * s, 'Lucy Parker', 18 * s, C.textPrimary, 600);
      svg += text(x + 28 * s, ry + 56 * s, 'Weekly dog walking — 2 dogs', 14 * s, C.textSecondary);
      svg += text(x + 28 * s, ry + 78 * s, 'New enquiry', 12 * s, C.textMuted);
      svg += roundedRect(x + 28 * s, ry + 88 * s, w - 56 * s, 36 * s, 8 * s, C.surfaceElevated, C.borderSubtle);
      svg += text(x + (w - 32 * s) / 2 + 16 * s, ry + 110 * s, 'Convert to client', 13 * s, C.textPrimary, 700, 'middle');
      ry += 132 * s;
      svg += card(x + 16 * s, ry, w - 32 * s, 120 * s, 12 * s);
      svg += text(x + 28 * s, ry + 32 * s, 'Tom Hughes', 18 * s, C.textPrimary, 600);
      svg += text(x + 28 * s, ry + 56 * s, 'Puppy training — 6 sessions', 14 * s, C.textSecondary);
      svg += text(x + 28 * s, ry + 78 * s, 'Contacted', 12 * s, C.statusUpcoming);
      svg += roundedRect(x + 28 * s, ry + 88 * s, w - 56 * s, 36 * s, 8 * s, C.surfaceElevated, C.borderSubtle);
      svg += text(x + (w - 32 * s) / 2 + 16 * s, ry + 110 * s, 'Convert to client', 13 * s, C.textPrimary, 700, 'middle');
      svg += bottomTabBar(x, y, w, h, s, ['Home', 'Jobs', 'Money', 'More'], 0);
      return svg;
    },
  },
  settings: {
    headline: 'Built for trades, walkers, trainers and more',
    subtitle: 'Tailor labels and workflows to your business type.',
    render: (x, y, w, h, s) => {
      let svg = appHeader(x, y, w, 'More', s);
      let cy = y + 88 * s + 8 * s;
      svg += text(x + 16 * s, cy, 'BUSINESS TYPE', 13 * s, C.textSecondary, 500);
      cy += 20 * s;
      svg += card(x + 16 * s, cy, w - 32 * s, 280 * s, 12 * s);
      svg += text(x + 28 * s, cy + 28 * s, 'Changes labels across the app', 13 * s, C.textMuted);
      const types = [
        ['🔧', 'Trades & Contractors', true],
        ['🦮', 'Dog Walker', false],
        ['🎾', 'Dog Trainer', false],
        ['💇', 'Hairdresser / Barber', false],
      ];
      types.forEach(([icon, label, selected], i) => {
        svg += businessTypeRow(x + 24 * s, cy + 44 * s + i * 48 * s, w - 48 * s, icon, label, selected, s);
      });
      cy += 296 * s;
      svg += text(x + 16 * s, cy, 'WORK STYLE', 13 * s, C.textSecondary, 500);
      cy += 20 * s;
      svg += card(x + 16 * s, cy, w - 32 * s, 140 * s, 12 * s);
      ['I visit customers', 'Customers visit me', 'I do both'].forEach((label, i) => {
        svg += businessTypeRow(x + 24 * s, cy + 16 * s + i * 44 * s, w - 48 * s, '', label, i === 0, s);
      });
      cy += 156 * s;
      svg += text(x + 16 * s, cy, 'BUSINESS PROFILE', 13 * s, C.textSecondary, 500);
      cy += 20 * s;
      svg += card(x + 16 * s, cy, w - 32 * s, 160 * s, 12 * s);
      svg += roundedRect(x + 28 * s, cy + 16 * s, w - 56 * s, 40 * s, 8 * s, C.surfaceElevated, C.borderSubtle);
      svg += text(x + 40 * s, cy + 42 * s, 'Turner Plumbing Ltd', 15 * s, C.textPrimary);
      svg += roundedRect(x + 28 * s, cy + 64 * s, w - 56 * s, 40 * s, 8 * s, C.surfaceElevated, C.borderSubtle);
      svg += text(x + 40 * s, cy + 90 * s, '07700 900123', 15 * s, C.textPrimary);
      svg += roundedRect(x + 28 * s, cy + 112 * s, w - 56 * s, 40 * s, 8 * s, C.surfaceElevated, C.borderSubtle);
      svg += text(x + 40 * s, cy + 138 * s, 'hello@turnerplumbing.co.uk', 15 * s, C.textPrimary);
      svg += bottomTabBar(x, y, w, h, s, ['Home', 'Jobs', 'Money', 'More'], 3);
      return svg;
    },
  },
};

function renderScreenshot({ width, height, screenKey, deviceLabel }) {
  const screen = SCREENS[screenKey];
  const isPhone = width < 1600;
  const headlineSize = isPhone ? 56 : 72;
  const subtitleSize = isPhone ? 28 : 34;
  const headlineY = isPhone ? 200 : 180;
  const subtitleY = headlineY + (isPhone ? 52 : 58);

  const framePadX = isPhone ? 72 : 220;
  const frameTop = isPhone ? 340 : 320;
  const frameWidth = width - framePadX * 2;
  const frameHeight = height - frameTop - (isPhone ? 80 : 100);
  const cornerRadius = isPhone ? 48 : 36;
  const bezel = isPhone ? 14 : 18;
  const screenX = framePadX + bezel;
  const screenY = frameTop + bezel;
  const screenW = frameWidth - bezel * 2;
  const screenH = frameHeight - bezel * 2;
  const uiScale = screenW / 390;

  const screenContent = screen.render(screenX, screenY, screenW, screenH, uiScale);

  const notch = isPhone
    ? `<rect x="${framePadX + frameWidth / 2 - 70}" y="${frameTop + 8}" width="140" height="28" rx="14" fill="${C.frameOuter}"/>`
    : '';

  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.canvasTop}"/>
      <stop offset="100%" stop-color="${C.canvasBottom}"/>
    </linearGradient>
    <filter id="deviceShadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  ${text(width / 2, headlineY, screen.headline, headlineSize, C.textPrimary, 700, 'middle')}
  ${text(width / 2, subtitleY, screen.subtitle, subtitleSize, C.textSecondary, 400, 'middle')}
  <g filter="url(#deviceShadow)">
    ${roundedRect(framePadX, frameTop, frameWidth, frameHeight, cornerRadius, C.frameOuter, '#333333', 2)}
    ${roundedRect(framePadX + bezel - 2, frameTop + bezel - 2, frameWidth - bezel * 2 + 4, frameHeight - bezel * 2 + 4, cornerRadius - 8, C.frameBezel, 'none')}
    ${notch}
    ${roundedRect(screenX, screenY, screenW, screenH, isPhone ? cornerRadius - bezel : 8, C.background, 'none')}
    <clipPath id="screenClip">
      <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" rx="${isPhone ? cornerRadius - bezel : 8}"/>
    </clipPath>
    <g clip-path="url(#screenClip)">
      ${screenContent}
    </g>
  </g>
  ${text(width / 2, height - (isPhone ? 36 : 48), deviceLabel, isPhone ? 22 : 26, C.textMuted, 400, 'middle')}
</svg>`);
}

const SCREEN_ORDER = [
  { key: 'home', file: '01-home-client-list' },
  { key: 'workspace', file: '02-client-workspace' },
  { key: 'quote', file: '03-create-quote' },
  { key: 'money', file: '04-invoices-money' },
  { key: 'leads', file: '05-leads-convert' },
  { key: 'settings', file: '06-settings-business-type' },
];

async function generateSet(outDir, width, height, deviceLabel) {
  await mkdir(outDir, { recursive: true });
  for (const { key, file } of SCREEN_ORDER) {
    const svg = renderScreenshot({ width, height, screenKey: key, deviceLabel });
    const outPath = path.join(outDir, `${file}.png`);
    const meta = await sharp(svg).png().toBuffer({ resolveWithObject: true });
    if (meta.info.width !== width || meta.info.height !== height) {
      await sharp(svg).resize(width, height, { fit: 'fill' }).png().toFile(outPath);
    } else {
      await sharp(svg).png().toFile(outPath);
    }
    const verify = await sharp(outPath).metadata();
    console.log(`  ${path.relative(ROOT, outPath)} — ${verify.width}×${verify.height}`);
  }
}

async function main() {
  console.log('Generating iPhone 6.5" screenshots (1284×2778)…');
  await generateSet(OUT_IPHONE, 1284, 2778, 'TradeKeepCRM · iPhone');

  console.log('Generating iPad 13" screenshots (2048×2732)…');
  await generateSet(OUT_IPAD, 2048, 2732, 'TradeKeepCRM · iPad');

  console.log(`\nDone — ${SCREEN_ORDER.length} screenshots per device.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
