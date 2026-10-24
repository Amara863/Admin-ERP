// Values that are calculated, not stored (same as the views in Supabase)
import { TODAY, daysAgo } from './generate';

const OUT = ['Sold', 'Given away', 'Died'];

// a cow is in stock unless its latest movement is an "Out" movement
export function lastMove(db) {
  const m = {};
  db.cow_movements.forEach((x) => { if (!m[x.cow_id] || m[x.cow_id].movement_date < x.movement_date) m[x.cow_id] = x; });
  return m;
}
export function cowsInStock(db) {
  const lm = lastMove(db);
  return db.cows.filter((c) => !(lm[c.cow_id] && OUT.includes(lm[c.cow_id].movement_type)));
}
export const lactations = (db, cowId) => db.cows.filter((c) => c.mother_id === cowId).length;

// product stock = produced − sold + other movements (view stock_summary)
export function stockSummary(db) {
  const prod = {}, sold = {}, other = {};
  db.production_log.forEach((p) => { prod[p.byproduct_id] = (prod[p.byproduct_id] || 0) + Number(p.output_qty || 0); });
  const cancelled = new Set(db.orders.filter((o) => o.delivery_status === 'Cancelled').map((o) => o.order_id));
  db.order_items.forEach((oi) => { if (!cancelled.has(oi.order_id)) sold[oi.variant_id] = (sold[oi.variant_id] || 0) + Number(oi.quantity); });
  db.stock_movements.forEach((s) => { other[s.variant_id] = (other[s.variant_id] || 0) + Number(s.quantity); });
  const out = {};
  db.product_variants.forEach((v) => {
    const p = prod[v.variant_id] || 0, sd = sold[v.variant_id] || 0, o = other[v.variant_id] || 0;
    out[v.variant_id] = { produced: p, sold: sd, other: o, current: Math.round((p - sd + o) * 100) / 100 };
  });
  return out;
}
export function lowStock(db, summary = stockSummary(db)) {
  return db.product_variants.filter((v) => v.is_active && v.reorder_level != null && summary[v.variant_id].current < v.reorder_level);
}

export const orderTotal = (db, orderId) =>
  db.order_items.filter((i) => i.order_id === orderId).reduce((s, i) => s + i.quantity * i.unit_price, 0);

// milk per day (map date -> litres) for a set of cows (or all)
// shed-wise milk (shed_milk) is added only when no cow filter is given – a shed should use either cow-wise or shed-wise entry
export function milkByDate(db, filter) {
  const m = {};
  db.milk_production.forEach((r) => { if (!filter || filter(r)) m[r.milk_date] = (m[r.milk_date] || 0) + Number(r.quantity_ltr); });
  if (!filter) (db.shed_milk || []).forEach((r) => { m[r.milk_date] = (m[r.milk_date] || 0) + Number(r.quantity_ltr); });
  return m;
}

// period helpers for reports
export function periodKey(date, period) {
  if (period === 'monthly') return date.slice(0, 7);
  if (period === 'yearly') return date.slice(0, 4);
  return date;
}
export function periodLabel(key, period) {
  if (period === 'monthly') return new Date(key + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  if (period === 'yearly') return key;
  return new Date(key).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
export function inPeriod(date, period) {
  if (period === 'daily') return date >= daysAgo(29);
  if (period === 'monthly') return date >= daysAgo(364);
  return true;
}

// a shed worker's supervisor comes from the shed; others have reports_to
export function bossOf(db, s) {
  if (s.reports_to) return s.reports_to;
  if (s.shed_id) return db.sheds.find((x) => x.shed_id === s.shed_id)?.supervisor_id || null;
  return null;
}

export { TODAY, daysAgo };

// feeding of a shed on a date (from daily_diary) → used for "Fed today?" on cow pages
export function feedingOf(db, shedId, date = TODAY) {
  const rows = db.daily_diary.filter((x) => x.shed_id === shedId && x.entry_date === date && x.entry_type === 'Feeding')
    .sort((a, b) => (a.scheduled_time < b.scheduled_time ? -1 : 1));
  const now = new Date().toTimeString().slice(0, 5);
  let state = 'Not recorded';
  if (rows.length) {
    if (rows.some((x) => x.status === 'Missed')) state = 'Missed';
    else if (rows.every((x) => x.status === 'Done')) state = 'Done';
    else state = 'Delayed';
  }
  return { rows, state, now };
}
