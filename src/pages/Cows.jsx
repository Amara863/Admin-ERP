import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useStore, ageOf } from '../context/StoreContext';
import { PageHead, Badge, Modal, FormFields, Confirm, Pager } from '../components/UI';
import { cowsInStock, lactations, feedingOf, TODAY } from '../data/calc';

const TYPES = ['Milking cow', 'Dry cow', 'Heifer', 'Calf', 'Bull'];
const BREEDS = ['Gir', 'Sahiwal', 'Tharparkar', 'Rathi', 'Kankrej', 'Desi', 'Other'];

export default function Cows() {
  const store = useStore();
  const { db, nameOf, user } = store;
  const navigate = useNavigate();
  const editable = store.canEdit('/cows');
  const isWorker = user.role === 'Worker';
  const [filter, setFilter] = useState('All');
  const [shed, setShed] = useState(isWorker && user.shed_id ? user.shed_id : 'All');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [del, setDel] = useState(null);
  const [page, setPage] = useState(1);

  const herd = useMemo(() => cowsInStock(db).filter((c) => c.shed_id), [db]);
  const feed = useMemo(() => Object.fromEntries(db.sheds.map((s) => [s.shed_id, feedingOf(db, s.shed_id, TODAY)])), [db]);
  const milkToday = useMemo(() => {
    const m = {};
    db.milk_production.forEach((r) => { if (r.milk_date === TODAY) m[r.cow_id] = (m[r.cow_id] || 0) + r.quantity_ltr; });
    return m;
  }, [db]);

  const groups = { All: herd, ...Object.fromEntries(TYPES.map((t) => [t, herd.filter((c) => c.cow_type === t)])),
    Pregnant: herd.filter((c) => c.status === 'Pregnant'), Sick: herd.filter((c) => c.status === 'Sick') };
  let rows = groups[filter];
  if (shed !== 'All') rows = rows.filter((c) => c.shed_id === shed);
  if (search) { const s = search.toLowerCase(); rows = rows.filter((c) => [c.cow_name, c.tag_number, c.breed, c.cow_id].some((v) => String(v).toLowerCase().includes(s))); }
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  const pg = Math.min(page, pages);
  const shown = rows.slice((pg - 1) * 25, pg * 25);

  const females = db.cows.filter((c) => c.gender === 'Female').map((c) => ({ value: c.cow_id, label: `${(c.cow_name || c.tag_number)} (${c.cow_id})` }));
  const males = db.cows.filter((c) => c.cow_type === 'Bull').map((c) => ({ value: c.cow_id, label: `${(c.cow_name || c.tag_number)} (${c.cow_id})` }));
  const fields = [
    { key: 'tag_number', label: 'Tag number', required: true },
    { key: 'cow_name', label: 'Name (optional – tag number is enough)' },
    { key: 'breed', label: 'Breed', type: 'select', options: BREEDS, required: true },
    { key: 'gender', label: 'Gender', type: 'select', options: ['Female', 'Male'], required: true },
    { key: 'cow_type', label: 'Cow type', type: 'select', options: TYPES, required: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Healthy', 'Sick', 'Pregnant'], required: true },
    { key: 'dob', label: 'Date of birth', type: 'date' },
    { key: 'insemination_date', label: 'Insemination date', type: 'date' },
    { key: 'shed_id', label: 'Shed', type: 'select', options: db.sheds.map((s) => ({ value: s.shed_id, label: s.shed_name })), required: true },
    { key: 'plan_name', label: 'Diet plan', type: 'select', options: db.diet_plans.map((p) => p.plan_name) },
    { key: 'mother_id', label: 'Mother', type: 'select', options: females },
    { key: 'father_id', label: 'Father (bull)', type: 'select', options: males },
    { key: 'birth_type', label: 'Birth type', type: 'select', options: ['Normal', 'Assisted', 'C-section'] }
  ];
  const save = async (e) => {
    e.preventDefault();
    const row = { ...form };
    Object.keys(row).forEach((k) => { if (row[k] === '') row[k] = null; });
    if (editId) { if (!(await store.updateRow('cows', editId, row))) return; store.toast('Cow updated'); }
    else { if (!(await store.addRow('cows', row))) return; store.toast(`${(row.cow_name || row.tag_number)} added – also add a row in Cow Stock (how it came in)`); }
    setForm(null);
  };

  return (
    <>
      <PageHead title={isWorker ? 'Cows – feeding status' : 'Livestock (Cows)'} sub={isWorker ? `Check whether each cow was fed today (${new Date().toLocaleDateString('en-IN')})` : `${herd.length} cows in stock today`}>
        {editable && <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ gender: 'Female', cow_type: 'Milking cow', status: 'Healthy', plan_name: 'Milking cow' }); }}><Plus size={16} /> Add cow</button>}
      </PageHead>

      {isWorker && (
        <div className="stats">
          {db.sheds.filter((s) => feed[s.shed_id].rows.length).map((s) => (
            <div className="stat" key={s.shed_id} style={{ cursor: 'pointer', outline: shed === s.shed_id ? '2px solid var(--primary)' : 'none' }} onClick={() => setShed(s.shed_id)}>
              <div style={{ flex: 1 }}>
                <div className="stat-label">{s.shed_name}</div>
                <div style={{ margin: '6px 0' }}><Badge>{feed[s.shed_id].state}</Badge></div>
                {feed[s.shed_id].rows.map((x) => (
                  <div className="muted" key={x.entry_id}>{x.scheduled_time} {x.remarks}: <b>{x.status}</b>{x.done_time ? ` at ${x.done_time}` : ''}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="toolbar">
        <div className="chips">
          {Object.keys(groups).map((s) => (
            <button key={s} className={`chip ${filter === s ? 'active' : ''}`} onClick={() => { setFilter(s); setPage(1); }}>
              {s}<span className="count">{groups[s].length}</span>
            </button>
          ))}
        </div>
        <select className="input" style={{ width: 'auto', minWidth: 180 }} value={shed} onChange={(e) => { setShed(e.target.value); setPage(1); }}>
          <option value="All">All sheds</option>
          {db.sheds.map((s) => <option key={s.shed_id} value={s.shed_id}>{s.shed_name}</option>)}
        </select>
        <input className="input" placeholder="Search name, tag, breed…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ marginLeft: 'auto' }} />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Cow ID</th><th>Name</th><th>Breed</th><th>Type</th><th>Age</th><th>Shed</th>
              {!isWorker && <th className="num">Lactations</th>}{!isWorker && <th className="num">Milk today</th>}
              <th>Fed today?</th><th>Status</th>{editable && <th />}</tr>
          </thead>
          <tbody>
            {shown.map((c) => {
              const f = feed[c.shed_id];
              return (
                <tr key={c.cow_id} className={isWorker ? '' : 'clickable'} onClick={() => !isWorker && navigate(`/cows/${c.cow_id}`)}>
                  <td className="muted">{c.cow_id}<div style={{ fontSize: 11 }}>{c.tag_number}</div></td>
                  <td className="strong">{c.cow_name || <span className="muted">{c.tag_number}</span>}</td>
                  <td>{c.breed}</td>
                  <td><Badge>{c.cow_type}</Badge></td>
                  <td>{ageOf(c.dob)}{c.dob && <div className="muted" style={{ fontSize: 11 }} title="Govt aid: small ₹25/day, big ₹50/day">{(new Date() - new Date(c.dob)) / 31557600000 >= 2 ? 'Big' : 'Small'}</div>}</td>
                  <td>{nameOf('sheds', c.shed_id)}</td>
                  {!isWorker && <td className="num">{c.gender === 'Female' ? lactations(db, c.cow_id) : '—'}</td>}
                  {!isWorker && <td className="num">{milkToday[c.cow_id] ? `${milkToday[c.cow_id].toFixed(1)} L` : '—'}</td>}
                  <td title={f?.rows.map((x) => `${x.remarks}: ${x.status}`).join('\n')}>
                    <Badge tone={{ Done: 'green', Delayed: 'amber', Missed: 'red' }[f?.state] || 'gray'}>{{ Done: 'Yes – all 3 feeds', Delayed: 'Late', Missed: 'No – missed', 'Not recorded': 'Not recorded' }[f?.state || 'Not recorded']}</Badge>
                  </td>
                  <td><Badge>{c.status}</Badge></td>
                  {editable && (
                    <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" title="Edit" onClick={() => { setEditId(c.cow_id); setForm({ ...c }); }}><Pencil size={15} /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setDel(c)}><Trash2 size={15} /></button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty">No cows found.</div>}
        <div className="table-foot">
          <span>{isWorker ? 'Feeding status comes from the Daily Diary of the shed' : 'Click a cow to see its full profile'} · Showing {shown.length} of {rows.length}</span>
          <Pager page={pg} pages={pages} setPage={setPage} />
        </div>
      </div>

      {form && (
        <Modal title={editId ? `Edit ${(form.cow_name || form.tag_number)}` : 'Add cow'} onClose={() => setForm(null)}
          footer={<><button className="btn btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" form="cowForm">Save</button></>}>
          <form id="cowForm" onSubmit={save}>
            <FormFields fields={fields} values={form} onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))} />
          </form>
        </Modal>
      )}
      {del && <Confirm title="Delete cow" text={<>Delete <b>{(del.cow_name || del.tag_number)} ({del.cow_id})</b>? If the cow was sold / died, add it in Cow Stock instead so the history stays.</>}
        onClose={() => setDel(null)} onConfirm={async () => { if (await store.deleteRow('cows', del.cow_id)) store.toast('Cow deleted'); }} />}
    </>
  );
}
