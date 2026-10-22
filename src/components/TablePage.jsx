// One reusable page: filter chips + search + table + Add / Edit / Delete.
// Most pages (Health, Diary, Staff, Equipment…) are this component with
// different columns and form fields (see pages/tableConfigs.jsx).
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useStore, keyOf, PK, REQUIRED } from '../context/StoreContext';
import { Modal, FormFields, Confirm, Pager } from './UI';

const PAGE = 25;

export function DataTable({ config, onRowClick }) {
  const store = useStore();
  const { db } = store;
  const editable = store.canEdit(useLocation().pathname) && !config.readOnly;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState(null);         // null = closed; {} = add; {…row} = edit
  const [editKey, setEditKey] = useState(null);
  const [del, setDel] = useState(null);
  const [page, setPage] = useState(1);

  let rows = db[config.table];
  if (config.baseFilter) rows = rows.filter((r) => config.baseFilter(r, store));
  const all = rows;
  if (config.filterKey && filter !== 'All') rows = rows.filter((r) => String(r[config.filterKey]) === filter);
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter((r) => config.columns.some((c) => String((c.text ? c.text(r, store) : r[c.key]) ?? '').toLowerCase().includes(s)));
  }
  if (config.sort) rows = [...rows].sort(config.sort);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice((Math.min(page, pages) - 1) * PAGE, Math.min(page, pages) * PAGE);

  const rawFields = typeof config.fields === 'function' ? config.fields(store) : config.fields;
  const fields = rawFields?.map((f) => (f.type !== 'checkbox' && REQUIRED[config.table]?.includes(f.key) ? { ...f, required: true } : f));

  const openAdd = () => { setEditKey(null); setForm({ ...(config.defaults ? (typeof config.defaults === 'function' ? config.defaults(store) : config.defaults) : {}) }); };
  const openEdit = (r) => { setEditKey(keyOf(config.table, r)); setForm({ ...r }); };
  const save = async (e) => {
    e.preventDefault();
    const row = { ...form };
    fields.forEach((f) => {
      if (f.type === 'number' && row[f.key] !== undefined && row[f.key] !== '') row[f.key] = Number(row[f.key]);
      if (row[f.key] === '') row[f.key] = null;
    });
    if (editKey) { if (!(await store.updateRow(config.table, editKey, row))) return; store.toast(`${config.singular || 'Record'} updated`); }
    else { if (!(await store.addRow(config.table, row))) return; store.toast(`${config.singular || 'Record'} added`); }
    setForm(null);
  };

  const filterOptions = config.filterKey
    ? ['All', ...(config.filterOptions || [...new Set(all.map((r) => r[config.filterKey]).filter((x) => x != null))])]
    : [];

  return (
    <>
      <div className="toolbar">
        {config.filterKey && (
          <div className="chips">
            {filterOptions.map((o) => (
              <button key={o} className={`chip ${filter === o ? 'active' : ''}`} onClick={() => { setFilter(o); setPage(1); }}>
                {o}<span className="count">{o === 'All' ? all.length : all.filter((r) => String(r[config.filterKey]) === o).length}</span>
              </button>
            ))}
          </div>
        )}
        <input className="input" placeholder="Search…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ marginLeft: 'auto' }} />
        {fields && editable && (
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> {config.addLabel || 'Add'}</button>
        )}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {config.columns.map((c) => <th key={c.label} className={c.num ? 'num' : ''}>{c.label}</th>)}
              {fields && editable && <th />}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={keyOf(config.table, r)} className={onRowClick ? 'clickable' : ''} onClick={() => onRowClick?.(r)}>
                {config.columns.map((c) => (
                  <td key={c.label} className={c.num ? 'num' : ''}>{c.render ? c.render(r, store) : (r[c.key] ?? '—')}</td>
                ))}
                {fields && editable && (
                  <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn" title="Edit" onClick={() => openEdit(r)}><Pencil size={15} /></button>
                    <button className="icon-btn danger" title="Delete" onClick={() => setDel(r)}><Trash2 size={15} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty">No records found.</div>}
        <div className="table-foot">
          <span>Showing {shown.length} of {rows.length} records</span>
          <Pager page={Math.min(page, pages)} pages={pages} setPage={setPage} />
        </div>
      </div>

      {form && (
        <Modal title={editKey ? `Edit ${config.singular || 'record'}` : (config.addLabel || 'Add record')} onClose={() => setForm(null)}
          footer={<>
            <button className="btn btn-outline" onClick={() => setForm(null)}>Cancel</button>
            <button className="btn btn-primary" form="tpForm">Save</button>
          </>}>
          <form id="tpForm" onSubmit={save}>
            {/* key columns cannot be changed while editing */}
            <FormFields fields={editKey ? fields.map((f) => (PK[config.table].includes(f.key) ? { ...f, disabled: true } : f)) : fields}
              values={form} onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))} />
          </form>
        </Modal>
      )}
      {del && (
        <Confirm title={`Delete ${config.singular || 'record'}`} text="Are you sure? This action cannot be undone."
          onClose={() => setDel(null)} onConfirm={async () => { if (await store.deleteRow(config.table, keyOf(config.table, del))) store.toast('Deleted'); }} />
      )}
    </>
  );
}

// Page with optional tabs (e.g. Health → Health records | Treatments)
export default function TablePage({ title, sub, tabs, children }) {
  const [tab, setTab] = useState(0);
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{title}</h1>
          {sub && <p className="page-sub">{sub}</p>}
        </div>
      </div>
      {children}
      {tabs.length > 1 && (
        <div className="chips" style={{ marginBottom: 16 }}>
          {tabs.map((t, i) => (
            <button key={t.tabLabel} className={`chip ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t.tabLabel}</button>
          ))}
        </div>
      )}
      <DataTable key={tab + title} config={tabs[tab]} />
    </>
  );
}
