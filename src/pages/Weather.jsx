import { useState } from 'react';
import { Plus, Thermometer, Droplets, CloudSun } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useStore, fmtDate } from '../context/StoreContext';
import { PageHead, StatCard, Modal, FormFields, Pager } from '../components/UI';
import { TODAY } from '../data/calc';

// Weather is one Daily Diary row (entry_type = "Weather"); values are kept in remarks
// e.g. "Max 33°C, Min 22°C, Humidity 55%, Sunny". Later a DHT11 sensor can fill it.
const parse = (txt = '') => {
  const n = (re) => { const m = txt.match(re); return m ? Number(m[1]) : null; };
  const parts = txt.split(',').map((x) => x.trim());
  return { max: n(/Max\s*(-?\d+)/), min: n(/Min\s*(-?\d+)/), hum: n(/Humidity\s*(\d+)/), cond: parts.find((p) => !/\d/.test(p)) || '—', extra: parts.filter((p) => !/\d/.test(p)).slice(1).join(', ') };
};

export default function Weather() {
  const { db, nameOf, addRow, toast, canEdit, user } = useStore();
  const [form, setForm] = useState(null);
  const [page, setPage] = useState(1);

  const rows = db.daily_diary.filter((d) => d.entry_type === 'Weather').sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1)).map((r) => ({ ...r, w: parse(r.remarks) }));
  const latest = rows[0];
  const chart = rows.slice(0, 60).reverse().map((r) => ({ day: new Date(r.entry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), 'Max °C': r.w.max, 'Min °C': r.w.min, 'Humidity %': r.w.hum }));
  const pages = Math.max(1, Math.ceil(rows.length / 20));
  const pg = Math.min(page, pages);

  const fields = [
    { key: 'entry_date', label: 'Date', type: 'date', required: true },
    { key: 'cond', label: 'Condition', type: 'select', options: ['Sunny', 'Cloudy', 'Rainy', 'Humid', 'Cold', 'Windy'], required: true },
    { key: 'max', label: 'Max temperature (°C)', type: 'number', required: true },
    { key: 'min', label: 'Min temperature (°C)', type: 'number', required: true },
    { key: 'hum', label: 'Humidity (%)', type: 'number', required: true },
    { key: 'note', label: 'What was done (fans, water, bedding…)', full: true }
  ];
  const save = async (e) => {
    e.preventDefault();
    const ok = await addRow('daily_diary', { entry_date: form.entry_date, entry_type: 'Weather', shed_id: null, scheduled_time: null, done_time: null, item_id: null, quantity_kg: null,
      done_by: user.staff_id, verified_by: null, status: null, remarks: `Max ${form.max}°C, Min ${form.min}°C, Humidity ${form.hum}%, ${form.cond}${form.note ? ', ' + form.note : ''}` });
    if (ok) { setForm(null); toast('Weather saved'); }
  };

  return (
    <>
      <PageHead title="Weather" sub="Daily weather at the gaushala and what was done for the cows">
        {canEdit('/weather') && <button className="btn btn-primary" onClick={() => setForm({ entry_date: TODAY, cond: 'Sunny' })}><Plus size={16} /> Add today's weather</button>}
      </PageHead>
      {latest && (
        <div className="stats">
          <StatCard icon={Thermometer} label="Temperature (max / min)" value={`${latest.w.max}° / ${latest.w.min}°C`} note={fmtDate(latest.entry_date)} />
          <StatCard icon={Droplets} label="Humidity" value={`${latest.w.hum}%`} />
          <StatCard icon={CloudSun} label="Condition" value={latest.w.cond} note={latest.w.max >= 38 ? 'Heat stress – run fans, extra water' : latest.w.extra} trend={latest.w.max >= 38 ? 'down' : ''} />
        </div>
      )}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Temperature and humidity – last 60 days</div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={chart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#E6EEE0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B7A72' }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7A72' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #DCE6D3' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
              <Line type="monotone" dataKey="Max °C" stroke="#eb6834" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Min °C" stroke="#eda100" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Humidity %" stroke="#2a78d6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Date</th><th className="num">Max °C</th><th className="num">Min °C</th><th className="num">Humidity %</th><th>Condition</th><th>Note</th><th>Recorded by</th></tr></thead>
          <tbody>
            {rows.slice((pg - 1) * 20, pg * 20).map((r) => (
              <tr key={r.entry_id}>
                <td>{fmtDate(r.entry_date)}</td>
                <td className="num strong">{r.w.max ?? '—'}</td><td className="num">{r.w.min ?? '—'}</td><td className="num">{r.w.hum ?? '—'}</td>
                <td><span className="badge badge-lime">{r.w.cond}</span></td>
                <td className="muted">{r.w.extra || '—'}</td><td>{nameOf('staff', r.done_by)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-foot"><span>{rows.length} days · saved in the Daily Diary as type “Weather”</span><Pager page={pg} pages={pages} setPage={setPage} /></div>
      </div>
      {form && (
        <Modal title="Add weather" onClose={() => setForm(null)}
          footer={<><button className="btn btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" form="weatherForm">Save</button></>}>
          <form id="weatherForm" onSubmit={save}><FormFields fields={fields} values={form} onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))} /></form>
        </Modal>
      )}
    </>
  );
}
