import { useState } from 'react';
import { Phone, MapPin, Truck } from 'lucide-react';
import { useStore, rupee, fmtDate } from '../context/StoreContext';
import { PageHead, Badge, Modal, Confirm, Pager } from '../components/UI';
import { orderTotal } from '../data/calc';

const FLOW = ['Placed', 'Packed', 'Out for delivery', 'Delivered'];
// a new order from the website may come as 'Placed' or 'Pending' – both mean "new, not packed yet"
const isNew = (s) => s === 'Placed' || s === 'Pending';
const STATUSES = [...FLOW, 'Cancelled'];

export default function Orders() {
  const { db, find, nameOf, updateRow, toast, canEdit, variantName } = useStore();
  const editable = canEdit('/orders');
  const [filter, setFilter] = useState('All');
  const [type, setType] = useState('All');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [cancelOf, setCancelOf] = useState(null);
  const [page, setPage] = useState(1);

  const itemsOf = (id) => db.order_items.filter((i) => i.order_id === id);
  const drivers = db.drivers.filter((d) => d.is_available);

  let rows = [...db.orders].sort((a, b) => (a.order_date < b.order_date ? 1 : a.order_date > b.order_date ? -1 : b.order_id.localeCompare(a.order_id)));
  if (type !== 'All') rows = rows.filter((o) => o.order_type === type);
  if (filter !== 'All') rows = rows.filter((o) => o.delivery_status === filter);
  if (q) rows = rows.filter((o) => (o.order_id + nameOf('profiles', o.profile_id)).toLowerCase().includes(q.toLowerCase()));
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  const pg = Math.min(page, pages);
  const shown = rows.slice((pg - 1) * 25, pg * 25);

  // admin packs and assigns a driver; the Delivery app marks "Delivered"
  const nextStep = (o) => (isNew(o.delivery_status) ? 'Packed' : o.delivery_status === 'Packed' && o.driver_id ? 'Out for delivery' : null);
  const assign = async (o, driverId) => { if (await updateRow('orders', o.order_id, { driver_id: driverId || null }) && driverId) toast(`${o.order_id} assigned to ${nameOf('staff', driverId)}`); };
  const advance = async (o) => { const n = nextStep(o); if (await updateRow('orders', o.order_id, { delivery_status: n })) toast(`${o.order_id} marked ${n}`); };

  const open = openId && find('orders', openId);
  const customer = open && find('profiles', open.profile_id);

  return (
    <>
      <PageHead title="Orders" sub="Orders from the customer website. Pack them and assign a driver." />
      <div className="toolbar">
        <div className="chips">
          {['All', ...(db.orders.some((o) => o.delivery_status === 'Pending') ? ['Pending'] : []), ...STATUSES].map((s) => (
            <button key={s} className={`chip ${filter === s ? 'active' : ''}`} onClick={() => { setFilter(s); setPage(1); }}>
              {s}<span className="count">{s === 'All' ? db.orders.length : db.orders.filter((o) => o.delivery_status === s).length}</span>
            </button>
          ))}
        </div>
        <select className="input" style={{ marginLeft: 'auto', minWidth: 170 }} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="All">All order types</option>
          {[...new Set(['One-time', 'Subscription', 'Repeat', ...db.orders.map((o) => o.order_type).filter(Boolean)])].map((t) => <option key={t}>{t}</option>)}
        </select>
        <input className="input" placeholder="Order ID or customer…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th className="num">Amount</th><th>Slot</th><th>Payment</th><th>Driver</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {shown.map((o) => {
              const next = nextStep(o);
              const locked = !editable || ['Delivered', 'Cancelled', 'Out for delivery'].includes(o.delivery_status);
              return (
                <tr key={o.order_id}>
                  <td><button className="btn-link" onClick={() => setOpenId(o.order_id)}>{o.order_id}</button>
                    {o.order_type === 'Subscription' && <div className="muted">🔁 Daily</div>}</td>
                  <td>{fmtDate(o.order_date)}</td>
                  <td className="strong">{nameOf('profiles', o.profile_id)}</td>
                  <td style={{ maxWidth: 260 }}>{itemsOf(o.order_id).map((i) => `${variantName(i.variant_id)} × ${i.quantity}`).join(', ')}</td>
                  <td className="num strong">{rupee(orderTotal(db, o.order_id))}</td>
                  <td>{nameOf('delivery_slots', o.slot_id)}</td>
                  <td>{o.payment_mode}{o.amount_paid ? '' : <div className="muted">not paid</div>}</td>
                  <td>
                    {locked ? (o.driver_id ? nameOf('staff', o.driver_id) : '—') : (
                      <select className="input" style={{ padding: '5px 8px', minWidth: 140 }} value={o.driver_id || ''} onChange={(e) => assign(o, e.target.value)}>
                        <option value="">Assign…</option>
                        {drivers.map((d) => <option key={d.driver_id} value={d.driver_id}>{nameOf('staff', d.driver_id)}</option>)}
                      </select>
                    )}
                  </td>
                  <td><Badge>{o.delivery_status}</Badge></td>
                  <td>
                    {editable && next && <button className="btn btn-primary btn-sm" onClick={() => advance(o)}>{next === 'Packed' ? 'Mark packed' : 'Send out'}</button>}
                    {editable && o.delivery_status === 'Packed' && !o.driver_id && <span className="muted">Assign driver first</span>}
                    {o.delivery_status === 'Out for delivery' && <span className="muted">With driver</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty">No orders.</div>}
        <div className="table-foot">
          <span>“Delivered” is updated by the driver from the Delivery app · {rows.length} orders</span>
          <Pager page={pg} pages={pages} setPage={setPage} />
        </div>
      </div>

      {open && (
        <Modal title={`Order ${open.order_id}`} onClose={() => setOpenId(null)}
          footer={<>
            {editable && (isNew(open.delivery_status) || open.delivery_status === 'Packed') && <button className="btn btn-danger" onClick={() => setCancelOf(open)}>Cancel order</button>}
            <button className="btn btn-outline" onClick={() => window.print()}>Print invoice</button>
            <button className="btn btn-primary" onClick={() => setOpenId(null)}>Close</button>
          </>}>
          {open.delivery_status !== 'Cancelled' ? (
            <div className="timeline" style={{ marginBottom: 20 }}>
              {FLOW.map((s, i) => <div key={s} className={`tl-step ${i <= (isNew(open.delivery_status) ? 0 : FLOW.indexOf(open.delivery_status)) ? 'done' : ''}`}><div className="tl-dot" />{s}</div>)}
            </div>
          ) : <p style={{ marginBottom: 16 }}><Badge>Cancelled</Badge></p>}
          <div className="grid-2-equal" style={{ marginBottom: 16 }}>
            <div>
              <div className="label">Customer</div>
              <div className="strong">{customer?.full_name}</div>
              <div className="muted"><Phone size={12} /> {customer?.phone}</div>
              <div className="muted"><MapPin size={12} /> {open.delivery_address}</div>
            </div>
            <div>
              <div className="label">Delivery</div>
              <div>{fmtDate(open.delivery_date)} · {nameOf('delivery_slots', open.slot_id)}</div>
              <div className="muted">{open.order_type} · {open.payment_mode} · paid {rupee(open.amount_paid)}</div>
              <div className="muted"><Truck size={12} /> {open.driver_id ? nameOf('staff', open.driver_id) : 'Not assigned'}</div>
            </div>
          </div>
          <table className="table" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
            <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {itemsOf(open.order_id).map((i) => (
                <tr key={i.variant_id}><td>{variantName(i.variant_id)}</td><td className="num">{i.quantity}</td><td className="num">{rupee(i.unit_price)}</td><td className="num">{rupee(i.quantity * i.unit_price)}</td></tr>
              ))}
              <tr><td colSpan={3} className="strong">Total</td><td className="num strong">{rupee(orderTotal(db, open.order_id))}</td></tr>
            </tbody>
          </table>
        </Modal>
      )}
      {cancelOf && <Confirm title="Cancel order" confirmLabel="Cancel order" text={`Cancel order ${cancelOf.order_id}? Stock of its items comes back.`}
        onClose={() => setCancelOf(null)} onConfirm={async () => { if (await updateRow('orders', cancelOf.order_id, { delivery_status: 'Cancelled', amount_paid: 0 })) toast(`${cancelOf.order_id} cancelled`); setOpenId(null); }} />}
    </>
  );
}