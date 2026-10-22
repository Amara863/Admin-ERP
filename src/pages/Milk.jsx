import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Sun, Moon, Droplets, FlaskConical } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useStore } from '../context/StoreContext';
import { PageHead, StatCard, Modal, FormFields, Badge } from '../components/UI';
import { TODAY, daysAgo, cowsInStock } from '../data/calc';

export default function Milk() {
  const { db, nameOf, addRow, toast, canEdit, user } = useStore();
  const [shed, setShed] = useState('All');
  const [date, setDate] = useState(TODAY);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({});

  const shedOf = Object.fromEntries(db.cows.map((c) => [c.cow_id, c.shed_id]));
  const rows = db.milk_production.filter((m) => m.milk_date === date && (shed === 'All' || shedOf[m.cow_id] === shed)).sort((a, b) => a.shift.localeCompare(b.shift) || a.cow_id.localeCompare(b.cow_id));
  const sum = (list) => list.reduce((s, m) => s + m.quantity_ltr, 0);
  const morning = sum(rows.filter((r) => r.shift === 'Morning'));
  const evening = sum(rows.filter((r) => r.shift === 'Evening'));
  const avg = (key) => (rows.length ? (rows.reduce((s, m) => s + m[key], 0) / rows.length).toFixed(1) : '—');

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = daysAgo(6 - i);
    const day = db.milk_production.filter((m) => m.milk_date === d && (shed === 'All' || shedOf[m.cow_id] === shed));
    return {
      day: new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
      Morning: +sum(day.filter((m) => m.shift === 'Morning')).toFixed(1),
      Evening: +sum(day.filter((m) => m.shift === 'Evening')).toFixed(1)
    };
  });

  const cowOptions = cowsInStock(db).filter((c) => c.cow_type === 'Milking cow').map((c) => ({ value: c.cow_id, label: `${c.cow_name} (${c.cow_id})` }));
  const fields = [
    { key: 'cow_id', label: 'Cow', type: 'select', options: cowOptions, required: true },
    { key: 'milk_date', label: 'Date', type: 'date', required: true },
    { key: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Evening'], required: true },
    { key: 'quantity_ltr', label: 'Milk (litres)', type: 'number', required: true },
    { key: 'fat_pct', label: 'Fat %', type: 'number' },
    { key: 'snf_pct', label: 'SNF %', type: 'number' },
    { key: 'milking_method', label: 'Milking method', type: 'select', options: ['Hand', 'Machine'] },
    { key: 'udder_cleaned', label: 'Udder cleaned before milking?', type: 'checkbox' },
    { key: 'equipment_name', label: 'Machine', type: 'select', options: db.equipment.filter((e) => e.equipment_type === 'Milking').map((e) => e.equipment_name) },
    { key: 'entered_by', label: 'Entered by', type: 'select', options: db.staff.filter((s) => ['Supervisor', 'Manager', 'Milker'].includes(s.role)).map((s) => ({ value: s.staff_id, label: `${s.name} – ${s.role}` })), full: true }
  ];

  const save = async (e) => {
    e.preventDefault();
    const ok = await addRow('milk_production', {
      ...form, quantity_ltr: Number(form.quantity_ltr), fat_pct: Number(form.fat_pct || 0), snf_pct: Number(form.snf_pct || 0), equipment_name: form.equipment_name || null
    });
    if (!ok) return;
    setAdding(false);
    setDate(form.milk_date);
    toast('Milk entry saved');
  };

  return (
    <>
      <PageHead title="Milk Production" sub="Daily milk record of every cow – quantity, fat and SNF">
        <select className="input" style={{ width: 'auto' }} value={shed} onChange={(e) => setShed(e.target.value)}>
          <option value="All">All sheds</option>
          {db.sheds.filter((s) => ['Milking', 'Hospital'].includes(s.shed_type)).map((s) => <option key={s.shed_id} value={s.shed_id}>{s.shed_name}</option>)}
        </select>
        <input type="date" className="input" style={{ width: 170 }} value={date} max={TODAY} onChange={(e) => setDate(e.target.value)} />
        {canEdit('/milk') && <button className="btn btn-primary" onClick={() => {
          setForm({ milk_date: date, shift: new Date().getHours() < 12 ? 'Morning' : 'Evening', milking_method: 'Hand', udder_cleaned: true, entered_by: user.staff_id });
          setAdding(true);
        }}><Plus size={16} /> Add milk entry</button>}
      </PageHead>

      <div className="stats">
        <StatCard icon={Droplets} label="Total milk" value={`${(morning + evening).toFixed(1)} L`} note={new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} />
        <StatCard icon={Sun} label="Morning" value={`${morning.toFixed(1)} L`} />
        <StatCard icon={Moon} label="Evening" value={`${evening.toFixed(1)} L`} />
        <StatCard icon={FlaskConical} label="Average Fat / SNF" value={`${avg('fat_pct')}% / ${avg('snf_pct')}%`} />
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
        {rows.length === 0 && <div className="empty">No milk entries for this date.</div>}
        <div className="table-foot">{rows.length} entries</div>
      </div>

      {adding && (
        <Modal title="Add milk entry" onClose={() => setAdding(false)}
          footer={<><button className="btn btn-outline" onClick={() => setAdding(false)}>Cancel</button><button className="btn btn-primary" form="milkForm">Save</button></>}>
          <form id="milkForm" onSubmit={save}>
            <FormFields fields={fields} values={form} onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))} />
          </form>
        </Modal>
      )}
    </>
  );
}
