// Small reusable pieces used on every page
import { X } from 'lucide-react';

export function PageHead({ title, sub, crumb, children }) {
  return (
    <div className="page-head">
      <div>
        {crumb && <div className="crumb">{crumb}</div>}
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, note, trend, color, action }) {
  return (
    <div className="stat">
      <div style={{ flex: 1 }}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {note && <div className={`stat-note ${trend || ''}`}>{note}</div>}
        {action}
      </div>
      <div className="stat-icon round" style={color ? { background: color.bg, color: color.fg } : undefined}>
        <Icon size={22} />
      </div>
    </div>
  );
}

// colour for every status word used in the system
const BADGE = {
  'Placed': 'blue', 'Pending': 'blue', 'Packed': 'amber', 'Out for delivery': 'purple', 'Delivered': 'green', 'Cancelled': 'red',
  'Milking cow': 'green', 'Dry cow': 'gray', 'Pregnant': 'purple', 'Calf': 'lime', 'Heifer': 'lime', 'Sick': 'red', 'Bull': 'blue', 'Healthy': 'green',
  'Done': 'green', 'Delayed': 'amber', 'Missed': 'red', 'Ongoing': 'amber', 'Scheduled': 'blue',
  'Working': 'green', 'Under repair': 'red', 'Not in use': 'gray',
  'Completed': 'green', 'Booked': 'blue', 'Open': 'amber', 'Replied': 'green', 'Closed': 'gray',
  'Low stock': 'red', 'In stock': 'green', 'Out of stock': 'red',
  'Purchased': 'blue', 'Donated in': 'green', 'Rescued': 'lime', 'Sold': 'amber', 'Given away': 'purple', 'Died': 'red',
  'Yes': 'green', 'No': 'gray', 'Active': 'green', 'Inactive': 'gray', 'Skilled': 'blue', 'Unskilled': 'gray',
  'Director': 'red', 'Manager': 'purple', 'Supervisor': 'blue', 'Vet Doctor': 'amber', 'Worker': 'gray',
  'Good': 'green', 'Average': 'amber', 'Poor': 'red', 'Needs attention': 'red', 'OK': 'green'
};

export function Badge({ children, tone }) {
  return <span className={`badge badge-${tone || BADGE[children] || 'gray'}`}>{children}</span>;
}

export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ title, text, confirmLabel = 'Confirm Delete', onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-red" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button></>}>
      <p style={{ lineHeight: 1.6 }}>{text}</p>
    </Modal>
  );
}

// Builds a form from a list of fields: {key, label, type, options, full, required}
export function FormFields({ fields, values, onChange }) {
  return (
    <div className="form-grid">
      {fields.map((f) => (
        <div key={f.key} className={f.full ? 'full' : ''}>
          <label className="label">{f.label}{f.required ? ' *' : ''}</label>
          {f.type === 'select' ? (
            <select className="input" disabled={f.disabled} value={values[f.key] ?? ''} onChange={(e) => onChange(f.key, e.target.value)} required={f.required}>
              <option value="">Select…</option>
              {f.options.map((o) => {
                const val = typeof o === 'object' ? o.value : o;
                const lab = typeof o === 'object' ? o.label : o;
                return <option key={String(val)} value={val}>{lab}</option>;
              })}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea className="input" rows={3} value={values[f.key] ?? ''} onChange={(e) => onChange(f.key, e.target.value)} />
          ) : f.type === 'checkbox' ? (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 8 }}>
              <input type="checkbox" checked={!!values[f.key]} onChange={(e) => onChange(f.key, e.target.checked)} /> Yes
            </label>
          ) : (
            <input className="input" type={f.type || 'text'} step="any" required={f.required} disabled={f.disabled}
              value={values[f.key] ?? ''} onChange={(e) => onChange(f.key, e.target.value)} />
          )}
        </div>
      ))}
    </div>
  );
}

export function Pager({ page, pages, setPage }) {
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
      <span className="muted">Page {page} of {pages}</span>
      <button className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
    </div>
  );
}

export const yesNo = (v) => (v === true ? 'Yes' : v === false ? 'No' : '—');