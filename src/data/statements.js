// Report "statements" – like a bank statement: one report type, a date range (from – to),
// and either every entry or totals per day / week / month / year.
// Each builder returns { title, columns, rows, totals, summary } that the PDF / Excel / Word / Print code uses.
import { TODAY } from './calc';

const OUT = ['Sold', 'Given away', 'Died'];
const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const r1 = (x) => Math.round(x * 10) / 10;
const sum = (list, f) => list.reduce((t, x) => t + (Number(f(x)) || 0), 0);

// ---------- date range presets ----------
export const RANGES = [
  ['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['last30', 'Last 30 days'],
  ['year', 'This year'], ['custom', 'Custom (from – to)']
];
export function rangeOf(preset, from, to) {
  const t = new Date(TODAY);
  if (preset === 'today') return [TODAY, TODAY];
  if (preset === 'week') { const d = new Date(t); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [isoOf(d), TODAY]; }
  if (preset === 'month') return [`${TODAY.slice(0, 7)}-01`, TODAY];
  if (preset === 'last30') { const d = new Date(t); d.setDate(d.getDate() - 29); return [isoOf(d), TODAY]; }
  if (preset === 'year') return [`${TODAY.slice(0, 4)}-01-01`, TODAY];
  return [from || TODAY, to || TODAY];
}
export const fmtD = (s) => (s ? new Date(String(s).slice(0, 10)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

// ---------- grouping ----------
export const GROUPS = [['detail', 'Every entry'], ['day', 'Day-wise'], ['week', 'Week-wise'], ['month', 'Month-wise'], ['year', 'Year-wise']];
function groupKey(date, g) {
  const s = String(date).slice(0, 10);
  if (g === 'month') return s.slice(0, 7);
  if (g === 'year') return s.slice(0, 4);
  if (g === 'week') { const d = new Date(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoOf(d); }
  return s;
}
function groupLabel(key, g) {
  if (g === 'month') return new Date(`${key}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  if (g === 'year') return key;
  if (g === 'week') { const e = new Date(key); e.setDate(e.getDate() + 6); return `${fmtD(key)} – ${fmtD(isoOf(e))}`; }
  return fmtD(key);
}
// group rows by period → [{label, items}], oldest first
function byPeriod(list, dateOf, g) {
  const m = new Map();
  list.forEach((x) => { const k = groupKey(dateOf(x), g); if (!m.has(k)) m.set(k, []); m.get(k).push(x); });
  return [...m.keys()].sort().map((k) => ({ label: groupLabel(k, g), items: m.get(k) }));
}
const inRange = (date, from, to) => { const s = String(date || '').slice(0, 10); return s >= from && s <= to; };

// ---------- the reports ----------
// cols: {label, num?: true, money?: true}
export const REPORTS = [
  { key: 'milk', label: 'Milk production', page: '/milk' },
  { key: 'expenses', label: 'Purchases & expenses', page: '/expenses' },
  { key: 'sales', label: 'Sales (orders)', page: '/orders' },
  { key: 'feed', label: 'Feed given & gobar collected', page: '/diary' },
  { key: 'health', label: 'Health & treatment', page: '/health' },
  { key: 'donations', label: 'Donations & visits', page: '/seva' },
  { key: 'cowstock', label: 'Cow stock in / out', page: '/cow-stock' },
  { key: 'byproducts', label: 'Ghee & by-products made', page: '/production' }
];

export function buildReport(key, db, { from, to, group, shed }) {
  const name = (t, idCol, nameCol) => Object.fromEntries(db[t].map((r) => [r[idCol], r[nameCol]]));
  const cow = name('cows', 'cow_id', 'cow_name');
  const cowShed = Object.fromEntries(db.cows.map((c) => [c.cow_id, c.shed_id]));
  const shedName = name('sheds', 'shed_id', 'shed_name');
  const staff = name('staff', 'staff_id', 'name');
  const item = name('items', 'item_id', 'item_name');
  const contact = name('contacts', 'contact_id', 'name');
  const prof = name('profiles', 'profile_id', 'full_name');
  const product = name('products', 'product_id', 'product_name');
  const variant = Object.fromEntries(db.product_variants.map((v) => [v.variant_id, `${product[v.product_id] || v.product_id} (${v.size})`]));
  const shedOk = (sid) => !shed || shed === 'All' || sid === shed;
  const det = group === 'detail';

  if (key === 'milk') {
    const rows = db.milk_production.filter((m) => inRange(m.milk_date, from, to) && shedOk(cowShed[m.cow_id]))
      .sort((a, b) => (a.milk_date + a.shift + a.cow_id < b.milk_date + b.shift + b.cow_id ? -1 : 1));
    const total = sum(rows, (m) => m.quantity_ltr);
    const days = new Set(rows.map((m) => m.milk_date)).size || 1;
    const avg = (l, k) => (l.length ? r1(sum(l, (m) => m[k]) / l.length) : '');
    const summary = [['Total milk', `${r1(total)} L`], ['Average per day', `${r1(total / days)} L`],
      ['Morning', `${r1(sum(rows.filter((m) => m.shift === 'Morning'), (m) => m.quantity_ltr))} L`],
      ['Evening', `${r1(sum(rows.filter((m) => m.shift === 'Evening'), (m) => m.quantity_ltr))} L`],
      ['Average Fat / SNF', `${avg(rows, 'fat_pct')}% / ${avg(rows, 'snf_pct')}%`], ['Entries', rows.length]];
    if (det) return { summary, columns: [{ label: 'Date' }, { label: 'Shift' }, { label: 'Cow' }, { label: 'Shed' }, { label: 'Milk (L)', num: true }, { label: 'Fat %', num: true }, { label: 'SNF %', num: true }],
      rows: rows.map((m) => [fmtD(m.milk_date), m.shift, `${cow[m.cow_id] || ''} (${m.cow_id})`, shedName[cowShed[m.cow_id]] || '', Number(m.quantity_ltr), Number(m.fat_pct), Number(m.snf_pct)]),
      totals: ['Total', '', '', '', r1(total), '', ''] };
    const g = byPeriod(rows, (m) => m.milk_date, group);
    return { summary, columns: [{ label: 'Period' }, { label: 'Morning (L)', num: true }, { label: 'Evening (L)', num: true }, { label: 'Total (L)', num: true }, { label: 'Cows milked', num: true }, { label: 'Avg Fat %', num: true }, { label: 'Avg SNF %', num: true }],
      rows: g.map(({ label, items }) => [label, r1(sum(items.filter((m) => m.shift === 'Morning'), (m) => m.quantity_ltr)), r1(sum(items.filter((m) => m.shift === 'Evening'), (m) => m.quantity_ltr)),
        r1(sum(items, (m) => m.quantity_ltr)), new Set(items.map((m) => m.cow_id)).size, avg(items, 'fat_pct'), avg(items, 'snf_pct')]),
      totals: ['Total', r1(sum(rows.filter((m) => m.shift === 'Morning'), (m) => m.quantity_ltr)), r1(sum(rows.filter((m) => m.shift === 'Evening'), (m) => m.quantity_ltr)), r1(total), '', '', ''] };
  }

  if (key === 'expenses') {
    const CATS = ['Feed purchase', 'Medicine purchase', 'Salary', 'Electricity', 'Repair', 'Other'];
    const rows = db.purchases_expenses.filter((x) => inRange(x.txn_date, from, to)).sort((a, b) => (a.txn_date < b.txn_date ? -1 : 1));
    const total = sum(rows, (x) => x.amount);
    const summary = [['Total expenses', total, 'money'], ...CATS.map((c) => [c, sum(rows.filter((x) => x.category === c), (x) => x.amount), 'money']), ['Entries', rows.length]];
    if (det) return { summary, columns: [{ label: 'Date' }, { label: 'Txn ID' }, { label: 'Category' }, { label: 'Item / description' }, { label: 'Supplier' }, { label: 'Bill no.' }, { label: 'Amount', money: true }],
      rows: rows.map((x) => [fmtD(x.txn_date), x.txn_id, x.category, x.item_id ? item[x.item_id] : (x.description || ''), x.supplier_id ? contact[x.supplier_id] : '', x.bill_number || '', Number(x.amount)]),
      totals: ['Total', '', '', '', '', '', total] };
    const g = byPeriod(rows, (x) => x.txn_date, group);
    return { summary, columns: [{ label: 'Period' }, ...CATS.map((c) => ({ label: c.replace(' purchase', ''), money: true })), { label: 'Total', money: true }],
      rows: g.map(({ label, items }) => [label, ...CATS.map((c) => sum(items.filter((x) => x.category === c), (x) => x.amount)), sum(items, (x) => x.amount)]),
      totals: ['Total', ...CATS.map((c) => sum(rows.filter((x) => x.category === c), (x) => x.amount)), total] };
  }

  if (key === 'sales') {
    const lines = {};
    db.order_items.forEach((i) => { (lines[i.order_id] ||= []).push(i); });
    const amt = (o) => sum(lines[o.order_id] || [], (i) => i.quantity * i.unit_price);
    const rows = db.orders.filter((o) => o.delivery_status !== 'Cancelled' && inRange(o.order_date, from, to)).sort((a, b) => (a.order_date + a.order_id < b.order_date + b.order_id ? -1 : 1));
    const total = sum(rows, amt);
    const summary = [['Total sales', total, 'money'], ['Orders', rows.length], ['Average per order', rows.length ? total / rows.length : 0, 'money'],
      ['Delivered', rows.filter((o) => o.delivery_status === 'Delivered').length]];
    if (det) return { summary, columns: [{ label: 'Date' }, { label: 'Order ID' }, { label: 'Customer' }, { label: 'Items' }, { label: 'Payment' }, { label: 'Status' }, { label: 'Amount', money: true }],
      rows: rows.map((o) => [fmtD(o.order_date), o.order_id, prof[o.profile_id] || '', (lines[o.order_id] || []).map((i) => `${variant[i.variant_id]} x ${i.quantity}`).join(', '), o.payment_mode, o.delivery_status, amt(o)]),
      totals: ['Total', '', '', '', '', '', total] };
    const g = byPeriod(rows, (o) => o.order_date, group);
    return { summary, columns: [{ label: 'Period' }, { label: 'Orders', num: true }, { label: 'Delivered', num: true }, { label: 'Sales', money: true }],
      rows: g.map(({ label, items }) => [label, items.length, items.filter((o) => o.delivery_status === 'Delivered').length, sum(items, amt)]),
      totals: ['Total', rows.length, rows.filter((o) => o.delivery_status === 'Delivered').length, total] };
  }

  if (key === 'feed') {
    const rows = db.daily_diary.filter((x) => x.entry_type !== 'Weather' && inRange(x.entry_date, from, to) && shedOk(x.shed_id))
      .sort((a, b) => (a.entry_date + (a.scheduled_time || '') < b.entry_date + (b.scheduled_time || '') ? -1 : 1));
    const kg = (l, f) => Math.round(sum(l.filter(f), (x) => x.quantity_kg));
    const cols = [['Green fodder (kg)', (x) => x.item_id === 'FD-01'], ['Dry fodder (kg)', (x) => x.item_id === 'FD-02'], ['Concentrate (kg)', (x) => x.item_id === 'FD-03'], ['Gobar (kg)', (x) => x.entry_type === 'Dung removal']];
    const cnt = (l, s) => l.filter((x) => x.status === s).length;
    const summary = [...cols.map(([l, f]) => [l.replace(' (kg)', ''), `${kg(rows, f).toLocaleString('en-IN')} kg`]),
      ['Tasks done on time', cnt(rows, 'Done')], ['Tasks delayed', cnt(rows, 'Delayed')], ['Tasks missed', cnt(rows, 'Missed')]];
    if (det) return { summary, columns: [{ label: 'Date' }, { label: 'Shed' }, { label: 'Work' }, { label: 'Time (plan / done)' }, { label: 'Qty (kg)', num: true }, { label: 'Done by' }, { label: 'Status' }],
      rows: rows.map((x) => [fmtD(x.entry_date), shedName[x.shed_id] || '', `${x.entry_type} – ${x.remarks || ''}`, `${String(x.scheduled_time || '').slice(0, 5)} / ${String(x.done_time || '–').slice(0, 5)}`, x.quantity_kg ?? '', staff[x.done_by] || '', x.status || '']),
      totals: null };
    const g = byPeriod(rows, (x) => x.entry_date, group);
    return { summary, columns: [{ label: 'Period' }, ...cols.map(([l]) => ({ label: l, num: true })), { label: 'Done', num: true }, { label: 'Delayed', num: true }, { label: 'Missed', num: true }],
      rows: g.map(({ label, items }) => [label, ...cols.map(([, f]) => kg(items, f)), cnt(items, 'Done'), cnt(items, 'Delayed'), cnt(items, 'Missed')]),
      totals: ['Total', ...cols.map(([, f]) => kg(rows, f)), cnt(rows, 'Done'), cnt(rows, 'Delayed'), cnt(rows, 'Missed')] };
  }

  if (key === 'health') {
    const rows = db.health_records.filter((h) => inRange(h.check_date, from, to) && shedOk(h._shed || cowShed[h.cow_id])).sort((a, b) => (a.check_date < b.check_date ? -1 : 1));
    const meds = (h) => db.treatments.filter((t) => t.cow_id === h.cow_id && t.check_date === h.check_date);
    const sick = rows.filter((h) => h.condition === 'Sick');
    const loss = sum(rows, (h) => h.economic_loss);
    const summary = [['Health checks', rows.length], ['Sick cases', sick.length], ['Medicines given', sum(rows, (h) => meds(h).length)], ['Economic loss', loss, 'money']];
    if (det) return { summary, columns: [{ label: 'Date' }, { label: 'Cow' }, { label: 'Condition' }, { label: 'Disease / cause' }, { label: 'Medicines' }, { label: 'Doctor' }, { label: 'Loss', money: true }],
      rows: rows.map((h) => [fmtD(h.check_date), `${cow[h.cow_id] || ''} (${h.cow_id})`, h.condition, h.disease_name ? `${h.disease_name}${h.cause ? ' – ' + h.cause : ''}` : '', meds(h).map((t) => item[t.item_id]).join(', '), staff[h.vet_doctor_id] || '', Number(h.economic_loss || 0)]),
      totals: ['Total', '', '', '', '', '', loss] };
    const g = byPeriod(rows, (h) => h.check_date, group);
    return { summary, columns: [{ label: 'Period' }, { label: 'Checks', num: true }, { label: 'Sick cases', num: true }, { label: 'Medicines given', num: true }, { label: 'Economic loss', money: true }],
      rows: g.map(({ label, items }) => [label, items.length, items.filter((h) => h.condition === 'Sick').length, sum(items, (h) => meds(h).length), sum(items, (h) => h.economic_loss)]),
      totals: ['Total', rows.length, sick.length, sum(rows, (h) => meds(h).length), loss] };
  }

  if (key === 'donations') {
    const rows = db.seva_donations_visits.filter((s) => inRange(s.start_date, from, to)).sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
    const total = sum(rows, (s) => s.amount);
    const summary = [['Total received', total, 'money'], ['Donations', rows.filter((s) => s.entry_type === 'Donation').length],
      ['Pooja / Gau seva', rows.filter((s) => ['Pooja', 'Gau seva'].includes(s.entry_type)).length], ['Visitors', sum(rows.filter((s) => ['Visit', 'Stay'].includes(s.entry_type)), (s) => s.group_size)]];
    if (det) return { summary, columns: [{ label: 'Date' }, { label: 'Entry' }, { label: 'Type' }, { label: 'By' }, { label: 'Purpose' }, { label: 'Payment' }, { label: 'Receipt' }, { label: 'Amount', money: true }],
      rows: rows.map((s) => [fmtD(s.start_date), s.entry_id, s.entry_type, s.profile_id ? prof[s.profile_id] : contact[s.contact_id] || '', s.purpose || '', s.payment_mode || '', s.receipt_number || '', Number(s.amount || 0)]),
      totals: ['Total', '', '', '', '', '', '', total] };
    const g = byPeriod(rows, (s) => s.start_date, group);
    return { summary, columns: [{ label: 'Period' }, { label: 'Entries', num: true }, { label: 'Donations', num: true }, { label: 'Visitors', num: true }, { label: 'Amount', money: true }],
      rows: g.map(({ label, items }) => [label, items.length, items.filter((s) => s.entry_type === 'Donation').length, sum(items.filter((s) => ['Visit', 'Stay'].includes(s.entry_type)), (s) => s.group_size), sum(items, (s) => s.amount)]),
      totals: ['Total', rows.length, rows.filter((s) => s.entry_type === 'Donation').length, sum(rows.filter((s) => ['Visit', 'Stay'].includes(s.entry_type)), (s) => s.group_size), total] };
  }

  if (key === 'cowstock') {
    const rows = db.cow_movements.filter((m) => inRange(m.movement_date, from, to)).sort((a, b) => (a.movement_date < b.movement_date ? -1 : 1));
    const born = db.cows.filter((c) => c.mother_id && inRange(c.dob, from, to));
    const isIn = (m) => !OUT.includes(m.movement_type);
    const sold = sum(rows.filter((m) => m.movement_type === 'Sold'), (m) => m.amount);
    const summary = [['Came in', rows.filter(isIn).length + born.length], ['Born at farm', born.length], ['Went out', rows.filter((m) => !isIn(m)).length],
      ['Died', rows.filter((m) => m.movement_type === 'Died').length], ['Money from sale', sold, 'money']];
    if (det) {
      const all = [...rows.map((m) => ({ d: m.movement_date, c: m.cow_id, t: m.movement_type, who: contact[m.contact_id] || '', a: Number(m.amount || 0), r: m.remarks || '' })),
        ...born.map((c) => ({ d: c.dob, c: c.cow_id, t: 'Born', who: `Mother: ${cow[c.mother_id] || c.mother_id}`, a: 0, r: c.birth_type || '' }))].sort((a, b) => (a.d < b.d ? -1 : 1));
      return { summary, columns: [{ label: 'Date' }, { label: 'Cow' }, { label: 'In / Out' }, { label: 'From / To' }, { label: 'Remarks' }, { label: 'Amount', money: true }],
        rows: all.map((x) => [fmtD(x.d), `${cow[x.c] || ''} (${x.c})`, x.t, x.who, x.r, x.a]), totals: null };
    }
    const g = byPeriod([...rows.map((m) => ({ d: m.movement_date, t: m.movement_type, a: m.amount })), ...born.map((c) => ({ d: c.dob, t: 'Born', a: 0 }))], (x) => x.d, group);
    const c = (l, t) => l.filter((x) => x.t === t).length;
    return { summary, columns: [{ label: 'Period' }, { label: 'Born', num: true }, { label: 'Purchased', num: true }, { label: 'Donated in', num: true }, { label: 'Rescued', num: true }, { label: 'Sold', num: true }, { label: 'Given away', num: true }, { label: 'Died', num: true }, { label: 'Sale amount', money: true }],
      rows: g.map(({ label, items }) => [label, c(items, 'Born'), c(items, 'Purchased'), c(items, 'Donated in'), c(items, 'Rescued'), c(items, 'Sold'), c(items, 'Given away'), c(items, 'Died'), sum(items.filter((x) => x.t === 'Sold'), (x) => x.a)]),
      totals: null };
  }

  // by-products
  const rows = db.production_log.filter((p) => inRange(p.start_date, from, to)).sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
  const summary = [['Batches', rows.length], ...Object.entries(rows.reduce((m, p) => { const n = variant[p.byproduct_id] || p.byproduct_id; m[n] = (m[n] || 0) + Number(p.output_qty); return m; }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, q]) => [n, `${q} made`])];
  if (det) return { summary, columns: [{ label: 'Start' }, { label: 'End' }, { label: 'Product' }, { label: 'Input' }, { label: 'Output', num: true }, { label: 'Made by' }],
    rows: rows.map((p) => [fmtD(p.start_date), fmtD(p.end_date), variant[p.byproduct_id] || p.byproduct_id, `${p.input_qty} ${p.input_unit} ${p.input_material}`, Number(p.output_qty), staff[p.made_by] || '']), totals: null };
  const out = [];
  byPeriod(rows, (p) => p.start_date, group).forEach(({ label, items }) => {
    const m = {};
    items.forEach((p) => { const n = variant[p.byproduct_id] || p.byproduct_id; (m[n] ||= { b: 0, o: 0 }); m[n].b++; m[n].o += Number(p.output_qty); });
    Object.entries(m).forEach(([n, x]) => out.push([label, n, x.b, x.o]));
  });
  return { summary, columns: [{ label: 'Period' }, { label: 'Product' }, { label: 'Batches', num: true }, { label: 'Output', num: true }], rows: out, totals: null };
}
