import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Sun, Moon, Droplets, FlaskConical } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useStore } from '../context/StoreContext';
import { PageHead, StatCard, Modal, FormFields, Badge } from '../components/UI';
import { TODAY, daysAgo, cowsInStock } from '../data/calc';

// Two ways to record milk:
//  - Cow-wise  (milk_production): litres of each cow per shift, with fat / SNF
//  - Shed-wise (shed_milk):       litres of a whole shed per shift, with lactometer reading (how Pinjrapole Gaushala records it)
export default function Milk() {
  const { db, nameOf, addRow, toast, canEdit, user } = useStore();
  const shedMilk = db.shed_milk || [];
  const [mode, setMode] = useState(() => (shedMilk.length && !db.milk_production.length ? 'shed' : 'cow'));
  const [shed, setShed] = useState('All');
  const [date, setDate] = useState(TODAY);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({});
  const isShed = mode === 'shed';

  const shedOf = Object.fromEntries(db.cows.map((c) => [c.cow_id, c.shed_id]));
  const inShed = (m) => shed === 'All' || (isShed ? m.shed_id : shedOf[m.cow_id]) === shed;
  const source = isShed ? shedMilk : db.milk_production;
  const rows = source.filter((m) => m.milk_date === date && inShed(m))
    .sort((a, b) => a.shift.localeCompare(b.shift) || String(isShed ? a.shed_id : a.cow_id).localeCompare(String(isShed ? b.shed_id : b.cow_id)));
  const sum = (list) => list.reduce((s, m) => s + Number(m.quantity_ltr), 0);
  const morning = sum(rows.filter((r) => r.shift === 'Morning'));
  const evening = sum(rows.filter((r) => r.shift === 'Evening'));
  const avg = (key) => {
    const v = rows.filter((m) => m[key] != null && m[key] !== '');
    return v.length ? (v.reduce((s, m) => s + Number(m[key]), 0) / v.length).toFixed(1) : '—';
  };

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = daysAgo(6 - i);
    const day = source.filter((m) => m.milk_date === d && inShed(m));
    return {
      day: new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
      Morning: +sum(day.filter((m) => m.shift === 'Morning')).toFixed(1),
      Evening: +sum(day.filter((m) => m.shift === 'Evening')).toFixed(1)
    };
  });

  const enterers = db.staff.filter((s) => ['Supervisor', 'Manager', 'Milker', 'Shed worker'].includes(s.role)).map((s) => ({ value: s.staff_id, label: `${s.name} – ${s.role}` }));
  const cowOptions = cowsInStock(db).filter((c) => c.cow_type === 'Milking cow').map((c) => ({ value: c.cow_id, label: `${(c.cow_name || c.tag_number)} (${c.cow_id})` }));
  const cowFields = [
    { key: 'cow_id', label: 'Cow', type: 'select', options: cowOptions, required: true },
    { key: 'milk_date', label: 'Date', type: 'date', required: true },
    { key: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Evening'], required: true },
    { key: 'quantity_ltr', label: 'Milk (litres)', type: 'number', required: true },
    { key: 'fat_pct', label: 'Fat %', type: 'number' },
    { key: 'snf_pct', label: 'SNF %', type: 'number' },
    { key: 'milking_method', label: 'Milking method', type: 'select', options: ['Hand', 'Machine'] },
    { key: 'udder_cleaned', label: 'Udder cleaned before milking?', type: 'checkbox' },
    { key: 'equipment_name', label: 'Machine', type: 'select', options: db.equipment.filter((e) => e.equipment_type === 'Milking').map((e) => e.equipment_name) },
    { key: 'entered_by', label: 'Entered by', type: 'select', options: enterers, full: true }
  ];
  const shedFields = [
    { key: 'shed_id', label: 'Shed', type: 'select', options: db.sheds.filter((s) => s.shed_type !== 'Store').map((s) => ({ value: s.shed_id, label: s.shed_name })), required: true },
    { key: 'milk_date', label: 'Date', type: 'date', required: true },
    { key: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Evening'], required: true },
    { key: 'quantity_ltr', label: 'Milk of whole shed (litres)', type: 'number', required: true },
    { key: 'lactometer_reading', label: 'Lactometer reading (quality, usually 26–32)', type: 'number' },
    { key: 'entered_by', label: 'Entered by', type: 'select', options: enterers }
  ];

  const save = async (e) => {
    e.preventDefault();
    const ok = isShed
      ? await addRow('shed_milk', { ...form, quantity_ltr: Number(form.quantity_ltr), lactometer_reading: form.lactometer_reading === '' || form.lactometer_reading == null ? null : Number(form.lactometer_reading), entered_by: form.entered_by || null })
      : await addRow('milk_production', { ...form, quantity_ltr: Number(form.quantity_ltr), fat_pct: Number(form.fat_pct || 0), snf_pct: Number(form.snf_pct || 0), equipment_name: form.equipment_name || null });
    if (!ok) return;
    setAdding(false);
    setDate(form.milk_date);
    toast('Milk entry saved');
  };

  const openAdd = () => {
    const base = { milk_date: date, shift: new Date().getHours() < 12 ? 'Morning' : 'Evening', entered_by: user.staff_id };
    setForm(isShed ? { ...base, shed_id: shed !== 'All' ? shed : '' } : { ...base, milking_method: 'Hand', udder_cleaned: true });
    setAdding(true);
  };

  return (
    <>
      <PageHead title="Milk Production" sub={isShed ? 'Daily milk of every shed – quantity and lactometer reading' : 'Daily milk record of every cow – quantity, fat and SNF'}>
        <select className="input" style={{ width: 'auto' }} value={shed} onChange={(e) => setShed(e.target.value)}>
          <option value="All">All sheds</option>
          {db.sheds.filter((s) => s.shed_type !== 'Store').map((s) => <option key={s.shed_id} value={s.shed_id}>{s.shed_name}</option>)}
        </select>
        <input type="date" className="input" style={{ width: 170 }} value={date} max={TODAY} onChange={(e) => setDate(e.target.value)} />
        {canEdit('/milk') && <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add milk entry</button>}
      </PageHead>

      <div className="tabs-line">
        <button className={!isShed ? 'active' : ''} onClick={() => setMode('cow')}>Cow-wise</button>
        <button className={isShed ? 'active' : ''} onClick={() => setMode('shed')}>Shed-wise</button>
      </div>

      <div className="stats">
        <StatCard icon={Droplets} label="Total milk" value={`${(morning + evening).toFixed(1)} L`} note={new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} />
        <StatCard icon={Sun} label="Morning" value={`${morning.toFixed(1)} L`} />
        <StatCard icon={Moon} label="Evening" value={`${evening.toFixed(1)} L`} />
        {isShed
          ? <StatCard icon={FlaskConical} label="Average lactometer reading" value={avg('lactometer_reading')} />
          : <StatCard icon={FlaskConical} label="Average Fat / SNF" value={`${avg('fat_pct')}% / ${avg('snf_pct')}%`} />}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Morning vs evening – last 7 days</div>
        <div style={{ height: 250 }}>
          <ResponsiveContainer>
            <BarChart data={week} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barGap={2}>
              <CartesianGrid stroke="#E6EEE0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6B7A72' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7A72' }} axisLine={false} tickLine={false} unit=" L" />
              <Tooltip cursor={{ fill: '#F3F8EE' }} formatter={(v) => `${v} L`} contentStyle={{ borderRadius: 10, border: '1px solid #DCE6D3' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="Morning" fill="#388C5B" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Evening" fill="#D69E2E" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="table-wrap">
        {isShed ? (
          <table className="table">
            <thead>
              <tr><th>Shift</th><th>Shed</th><th>Shed worker</th><th className="num">Milk (L)</th><th className="num">Lactometer</th><th>Entered by</th></tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.shed_id + m.shift}>
                  <td>{m.shift === 'Morning' ? '🌅' : '🌇'} {m.shift}</td>
                  <td className="strong">{nameOf('sheds', m.shed_id)} <span className="muted">{m.shed_id}</span></td>
                  <td>{(() => { const w = db.sheds.find((x) => x.shed_id === m.shed_id)?.worker_id; return w ? nameOf('staff', w) : '—'; })()}</td>
                  <td className="num strong">{m.quantity_ltr}</td>
                  <td className="num">{m.lactometer_reading ?? '—'}</td>
                  <td>{m.entered_by ? nameOf('staff', m.entered_by) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Shift</th><th>Cow</th><th>Shed</th><th className="num">Milk (L)</th><th className="num">Fat %</th><th className="num">SNF %</th><th>Method</th><th>Udder cleaned</th><th>Entered by</th></tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.cow_id + m.shift}>
                  <td>{m.shift === 'Morning' ? '🌅' : '🌇'} {m.shift}</td>
                  <td><Link to={`/cows/${m.cow_id}`} className="strong">{nameOf('cows', m.cow_id)}</Link> <span className="muted">{m.cow_id}</span></td>
                  <td>{nameOf('sheds', shedOf[m.cow_id])}</td>
                  <td className="num strong">{m.quantity_ltr}</td>
                  <td className="num">{m.fat_pct}</td>
                  <td className="num">{m.snf_pct}</td>
                  <td>{m.milking_method}</td>
                  <td><Badge>{m.udder_cleaned ? 'Yes' : 'No'}</Badge></td>
                  <td>{nameOf('staff', m.entered_by)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {rows.length === 0 && <div className="empty">No milk entries for this date.</div>}
        <div className="table-foot">{rows.length} entries</div>
      </div>

      {adding && (
        <Modal title={isShed ? 'Add shed milk entry' : 'Add milk entry'} onClose={() => setAdding(false)}
          footer={<><button className="btn btn-outline" onClick={() => setAdding(false)}>Cancel</button><button className="btn btn-primary" form="milkForm">Save</button></>}>
          <form id="milkForm" onSubmit={save}>
            <FormFields fields={isShed ? shedFields : cowFields} values={form} onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))} />
          </form>
        </Modal>
      )}
    </>
  );
}
