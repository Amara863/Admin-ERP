// Products & Stock management (admin side)
// product = products table, each size/unit = product_variants row.
// Live stock is NOT stored – it is calculated: production_log (made) − order_items (sold) + stock_movements (opening, add, subtract, damaged…)
import { useMemo, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Plus, Pencil, Trash2, History, PackagePlus, Save, X, Search } from 'lucide-react';
import { useStore, rupee } from '../context/StoreContext';
import { PageHead, Badge, Modal, Confirm } from '../components/UI';
import { stockSummary } from '../data/calc';

const EMOJI = { 'Milk': '🥛', 'Milk-based': '🧈', 'Organic fertilizer': '🌱', 'Gobar-based': '🪔', 'Urine-based': '🧴', 'Organic produce': '🥬', 'Energy': '🔥' };
const CATEGORIES = Object.keys(EMOJI);
const now = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 19).replace('T', ' '); };
const fmtTime = (t) => new Date(t.replace(' ', 'T')).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function status(cur, v) {
  if (cur <= 0) return 'Out of stock';
  if (v.reorder_level != null && cur < v.reorder_level) return 'Low stock';
  return 'In stock';
}

export default function Products() {
  const store = useStore();
  const { db, find, user } = store;
  const editable = store.canEdit(useLocation().pathname);
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(params.get('add') === '1');
  const [editing, setEditing] = useState(null);     // variant_id being edited inline
  const [draft, setDraft] = useState({});
  const [stockOf, setStockOf] = useState(null);     // variant for Update Stock modal
  const [historyOf, setHistoryOf] = useState(null);
  const [delOf, setDelOf] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');

  const summary = useMemo(() => stockSummary(db), [db]);
  let rows = db.product_variants.map((v) => ({ v, p: find('products', v.product_id), cur: summary[v.variant_id]?.current ?? 0 })).filter((x) => x.p);
  const counts = { All: rows.length, 'Low stock': rows.filter((x) => status(x.cur, x.v) !== 'In stock').length };
  if (cat === 'Low stock') rows = rows.filter((x) => status(x.cur, x.v) !== 'In stock');
  else if (cat !== 'All') rows = rows.filter((x) => x.p.category === cat);
  if (q) rows = rows.filter((x) => (x.p.product_name + x.v.size + x.p.category).toLowerCase().includes(q.toLowerCase()));

  const startEdit = ({ v, p }) => { setEditing(v.variant_id); setDraft({ product_name: p.product_name, description: p.description, image_url: p.image_url || '', size: v.size, price: v.price, reorder_level: v.reorder_level ?? '', max_level: v.max_level ?? '' }); };
  const saveEdit = async ({ v, p }) => {
    const ok1 = await store.updateRow('products', p.product_id, { product_name: draft.product_name, description: draft.description, image_url: draft.image_url || null });
    const ok2 = await store.updateRow('product_variants', v.variant_id, { size: draft.size, price: Number(draft.price), reorder_level: draft.reorder_level === '' ? null : Number(draft.reorder_level), max_level: draft.max_level === '' ? null : Number(draft.max_level) });
    if (ok1 && ok2) { setEditing(null); store.toast('Product updated'); }
  };
  // a product that was already sold cannot be deleted (orders need it) → it is only hidden from the website
  const doDelete = async ({ v, p }) => {
    if (db.order_items.some((i) => i.variant_id === v.variant_id)) {
      if (await store.updateRow('product_variants', v.variant_id, { is_active: false })) store.toast('Already sold in orders – marked "Not for sale" instead of deleting');
      return;
    }
    if (!(await store.deleteWhere('stock_movements', { variant_id: v.variant_id }))) return;
    if (!(await store.deleteWhere('production_log', { byproduct_id: v.variant_id }))) return;
    if (!(await store.deleteWhere('cart_items', { variant_id: v.variant_id }))) return;
    if (!(await store.deleteRow('product_variants', v.variant_id))) return;
    if (db.product_variants.filter((x) => x.product_id === p.product_id).length === 1) await store.deleteRow('products', p.product_id);
    store.toast('Product deleted');
  };

  return (
    <>
      <PageHead title="Products & Stock" sub="Add, edit and delete products. Live stock = made − sold ± stock changes.">
        {editable && <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Add New Product</button>}
      </PageHead>

      {adding && <AddProduct onClose={() => { setAdding(false); if (params.get('add')) setParams({}); }} />}

      <div className="toolbar">
        <div className="chips">
          {['All', 'Low stock', ...CATEGORIES].map((c) => (
            <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
              {c}{counts[c] !== undefined && <span className="count">{counts[c]}</span>}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--muted)' }} />
          <input className="input" style={{ paddingLeft: 32 }} placeholder="Search product…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="prod-list">
        {rows.map((row) => {
          const { v, p, cur } = row;
          const st = status(cur, v);
          const pct = v.max_level ? Math.min(100, Math.round((cur / v.max_level) * 100)) : 0;
          const isEd = editing === v.variant_id;
          const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
          return (
            <div className="prod-row" key={v.variant_id}>
              <div className="prod-img">{p.image_url ? <img src={p.image_url} alt={p.product_name} /> : EMOJI[p.category] || '📦'}</div>
              {isEd ? (
                <div className="form-grid">
                  <div className="full"><label className="label">Title</label><input className="input" value={draft.product_name} onChange={set('product_name')} /></div>
                  <div><label className="label">Price (₹)</label><input className="input" type="number" value={draft.price} onChange={set('price')} /></div>
                  <div><label className="label">Unit</label><input className="input" value={draft.size} onChange={set('size')} /></div>
                  <div><label className="label">Min stock level</label><input className="input" type="number" value={draft.reorder_level} onChange={set('reorder_level')} /></div>
                  <div><label className="label">Max stock level</label><input className="input" type="number" value={draft.max_level} onChange={set('max_level')} /></div>
                  <div className="full"><label className="label">Image URL</label><input className="input" value={draft.image_url} onChange={set('image_url')} /></div>
                  <div className="full"><label className="label">Short description</label><input className="input" value={draft.description} onChange={set('description')} /></div>
                </div>
              ) : (
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="strong" style={{ fontSize: 15 }}>{p.product_name}</span>
                    <span className="muted">{v.variant_id}</span>
                    <Badge>{st}</Badge>
                    {!v.is_active && <Badge tone="gray">Not for sale</Badge>}
                  </div>
                  <div className="muted" style={{ marginTop: 2 }}>{p.description}</div>
                  <div className="prod-meta">
                    <span>Price: <b>{rupee(v.price)}</b> / {v.size}</span>
                    <span>Category: <b>{p.category}</b></span>
                    <span>Live stock: <b style={{ color: st === 'In stock' ? 'var(--primary)' : 'var(--red)' }}>{cur}</b></span>
                    <span>Min: <b>{v.reorder_level ?? '—'}</b></span>
                    <span>Max: <b>{v.max_level ?? '—'}</b></span>
                  </div>
                  {v.max_level ? <div className={`bar ${st === 'In stock' ? '' : 'red'}`} style={{ maxWidth: 320 }}><i style={{ width: `${pct}%` }} /></div> : null}
                </div>
              )}
              <div className="prod-actions">
                {isEd ? (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => saveEdit(row)}><Save size={14} /> Save</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}><X size={14} /> Cancel</button>
                  </>
                ) : (
                  <>
                    {editable && <button className="btn btn-outline btn-sm" onClick={() => startEdit(row)}><Pencil size={14} /> Edit</button>}
                    {editable && <button className="btn btn-primary btn-sm" onClick={() => setStockOf(row)}><PackagePlus size={14} /> Update Stock</button>}
                    <button className="btn btn-outline btn-sm" onClick={() => setHistoryOf(row)}><History size={14} /> History</button>
                    {editable && <button className="btn btn-danger btn-sm" onClick={() => setDelOf(row)}><Trash2 size={14} /> Delete</button>}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <div className="card empty">No products found.</div>}
      </div>

      {stockOf && <UpdateStock row={{ ...stockOf, cur: summary[stockOf.v.variant_id]?.current ?? 0 }} user={user} onClose={() => setStockOf(null)} />}
      {historyOf && <StockHistory row={historyOf} onClose={() => setHistoryOf(null)} />}
      {delOf && (
        <Confirm title="Delete Product" onClose={() => setDelOf(null)} onConfirm={() => doDelete(delOf)}
          text={<>Are you sure you want to delete <b>{delOf.p.product_name} ({delOf.v.size})</b>? Its stock history is also deleted. This cannot be undone.</>} />
      )}
    </>
  );
}

function AddProduct({ onClose }) {
  const store = useStore();
  const [f, setF] = useState({ product_name: '', image_url: '', price: '', size: '', stock: 0, reorder_level: 5, max_level: 100, description: '', category: 'Milk-based' });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async (e) => {
    e.preventDefault();
    const p = await store.addRow('products', { product_name: f.product_name, category: f.category, description: f.description, image_url: f.image_url || null, is_for_sale: true });
    if (!p) return;
    const v = await store.addRow('product_variants', { product_id: p.product_id, size: f.size, price: Number(f.price), reorder_level: Number(f.reorder_level), max_level: Number(f.max_level), is_active: true });
    if (!v) return;
    if (Number(f.stock) > 0) await store.addRow('stock_movements', { variant_id: v.variant_id, moved_at: now(), movement_type: 'Opening stock', quantity: Number(f.stock), reason: 'Initial stock', done_by: store.user.staff_id });
    store.toast('Product added');
    onClose();
  };
  return (
    <form className="card" style={{ marginBottom: 16 }} onSubmit={save}>
      <div className="card-title">Add New Product</div>
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div><label className="label">Title *</label><input className="input" required value={f.product_name} onChange={set('product_name')} placeholder="e.g. A2 Ghee" /></div>
        <div><label className="label">Image URL</label><input className="input" value={f.image_url} onChange={set('image_url')} placeholder="https://…" /></div>
        <div><label className="label">Price (₹) *</label><input className="input" type="number" min="0" required value={f.price} onChange={set('price')} /></div>
        <div><label className="label">Unit *</label><input className="input" required value={f.size} onChange={set('size')} placeholder="500 g / 1 L / Pack of 12" /></div>
        <div><label className="label">Category</label><select className="input" value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="label">Initial Stock</label><input className="input" type="number" min="0" value={f.stock} onChange={set('stock')} /></div>
        <div><label className="label">Min Stock Level</label><input className="input" type="number" min="0" value={f.reorder_level} onChange={set('reorder_level')} /></div>
        <div><label className="label">Max Stock Level</label><input className="input" type="number" min="0" value={f.max_level} onChange={set('max_level')} /></div>
        <div className="full" style={{ gridColumn: '1 / -1' }}><label className="label">Short Description</label><textarea className="input" rows={2} value={f.description} onChange={set('description')} /></div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button className="btn btn-primary"><Save size={15} /> Save Product</button>
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

function UpdateStock({ row, user, onClose }) {
  const store = useStore();
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const n = Math.max(0, Number(qty) || 0);
  const move = async (change, type, reason) => {
    if (!change) { store.toast('No change'); return; }
    if (row.cur + change < 0) { store.toast('Stock cannot go below 0'); return; }
    if (!(await store.addRow('stock_movements', { variant_id: row.v.variant_id, moved_at: now(), movement_type: type, quantity: change, reason: notes ? `${reason} – ${notes}` : reason, done_by: user.staff_id }))) return;
    store.toast(`Stock updated: ${row.cur} → ${row.cur + change}`);
    onClose();
  };
  return (
    <Modal title={`Update Stock – ${row.p.product_name} (${row.v.size})`} onClose={onClose}
      footer={<button className="btn btn-outline" onClick={onClose}>Cancel</button>}>
      <div className="muted" style={{ textAlign: 'center' }}>Current live stock</div>
      <div className="stock-big">{row.cur}</div>
      <label className="label">Quantity</label>
      <input className="input" type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} />
      <label className="label" style={{ marginTop: 10 }}>Notes (optional)</label>
      <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. new batch, spoiled, counted" />
      <div className="op-row">
        <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => move(n, 'Stock in', 'Added manually')}>Add (+{n})</button>
        <button className="btn btn-red" style={{ justifyContent: 'center' }} onClick={() => move(-n, 'Stock out', 'Removed manually')}>Subtract (−{n})</button>
        <button className="btn btn-blue" style={{ justifyContent: 'center' }} onClick={() => move(n - row.cur, 'Adjustment', 'Stock count set')}>Set to {n}</button>
      </div>
      <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => move(10, 'Stock in', 'Quick add')}>Quick Add +10</button>
    </Modal>
  );
}

function StockHistory({ row, onClose }) {
  const { db, nameOf } = useStore();
  const vid = row.v.variant_id;
  // one list of every change: production (in), sales (out), manual movements
  const ledger = useMemo(() => {
    const l = [];
    db.production_log.filter((p) => p.byproduct_id === vid).forEach((p) => l.push({ t: `${p.end_date || p.start_date} 18:00`, qty: Number(p.output_qty), reason: 'Production batch', notes: `${p.input_qty} ${p.input_unit} ${p.input_material}`, by: p.made_by }));
    const cancelled = new Set(db.orders.filter((o) => o.delivery_status === 'Cancelled').map((o) => o.order_id));
    db.order_items.filter((i) => i.variant_id === vid && !cancelled.has(i.order_id)).forEach((i) => {
      const o = db.orders.find((x) => x.order_id === i.order_id);
      l.push({ t: `${o.order_date} 12:00`, qty: -i.quantity, reason: 'Sale', notes: `Order ${o.order_id}`, by: null });
    });
    db.stock_movements.filter((s) => s.variant_id === vid).forEach((s) => l.push({ t: s.moved_at.length === 16 ? s.moved_at + ':00' : s.moved_at, qty: Number(s.quantity), reason: s.movement_type, notes: s.reason, by: s.done_by }));
    l.sort((a, b) => (a.t < b.t ? -1 : 1));
    let bal = 0;
    l.forEach((x) => { x.old = bal; bal = Math.round((bal + x.qty) * 100) / 100; x.new = bal; });
    return l.reverse();
  }, [db, vid]);
  return (
    <Modal wide title={`Stock Movement History – ${row.p.product_name} (${row.v.size})`} onClose={onClose}
      footer={<button className="btn btn-outline" onClick={onClose}>Close</button>}>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Type</th><th className="num">Quantity</th><th>Change</th><th>Reason</th><th>Notes</th><th>By</th><th>Time</th></tr></thead>
          <tbody>
            {ledger.slice(0, 80).map((x, i) => (
              <tr key={i}>
                <td><Badge tone={x.qty >= 0 ? 'green' : 'red'}>{x.qty >= 0 ? 'Stock In' : 'Stock Out'}</Badge></td>
                <td className="num strong">{x.qty >= 0 ? '+' : ''}{x.qty}</td>
                <td>{x.old} → <b>{x.new}</b></td>
                <td>{x.reason}</td>
                <td className="muted">{x.notes || '—'}</td>
                <td>{x.by ? nameOf('staff', x.by) : '—'}</td>
                <td className="muted">{fmtTime(x.t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {ledger.length === 0 && <div className="empty">No stock movement yet.</div>}
        {ledger.length > 80 && <div className="table-foot">Showing latest 80 of {ledger.length}</div>}
      </div>
    </Modal>
  );
}
