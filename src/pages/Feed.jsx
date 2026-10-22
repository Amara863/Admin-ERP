import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useStore } from '../context/StoreContext';
import { PageHead, Confirm } from '../components/UI';
import { DataTable } from '../components/TablePage';
import { FEED_STANDARDS } from '../data/standards';
import { cowsInStock, daysAgo } from '../data/calc';

// diet_plans table = the ration the farm actually uses. FEED_STANDARDS = default recommendation.
const planConfig = {
  table: 'diet_plans', singular: 'Diet plan', addLabel: 'Add diet plan',
  columns: [
    { label: 'Plan', render: (r) => <span className="strong">{r.plan_name}</span>, text: (r) => r.plan_name },
    { label: 'For', key: 'for_category' },
    { label: 'Green fodder (kg)', num: true, key: 'green_fodder_kg' },
    { label: 'Dry fodder (kg)', num: true, key: 'dry_fodder_kg' },
    { label: 'Concentrate (kg)', num: true, key: 'concentrate_kg' },
    { label: 'Mineral (kg)', num: true, key: 'mineral_kg' },
    { label: 'vs standard', render: (r) => {
      const s = FEED_STANDARDS.find((x) => x.plan_name === r.plan_name);
      if (!s) return '—';
      const same = ['green_fodder_kg', 'dry_fodder_kg', 'concentrate_kg', 'mineral_kg'].every((k) => Number(r[k]) === s[k]);
      return same ? <span className="badge badge-green">Standard</span> : <span className="badge badge-amber">Changed</span>;
    } },
    { label: 'Cows on plan', num: true, render: (r, s) => cowsInStock(s.db).filter((c) => c.shed_id && c.plan_name === r.plan_name).length }
  ],
  fields: [
    { key: 'plan_name', label: 'Plan name', required: true },
    { key: 'for_category', label: 'For category' },
    { key: 'green_fodder_kg', label: 'Green fodder (kg/day)', type: 'number' },
    { key: 'dry_fodder_kg', label: 'Dry fodder (kg/day)', type: 'number' },
    { key: 'concentrate_kg', label: 'Concentrate (kg/day)', type: 'number' },
    { key: 'mineral_kg', label: 'Mineral (kg/day)', type: 'number' }
  ]
};

export default function Feed() {
  const { db, canEdit, updateRow, addRow, toast } = useStore();
  const [reset, setReset] = useState(false);

  // shed-wise: what should be given (plans × cows) vs what the diary says was given (avg of last 7 days)
  const shedFeed = useMemo(() => {
    const plan = Object.fromEntries(db.diet_plans.map((p) => [p.plan_name, p]));
    const herd = cowsInStock(db).filter((c) => c.shed_id);
    return db.sheds.filter((s) => s.shed_type !== 'Store').map((s) => {
      const cows = herd.filter((c) => c.shed_id === s.shed_id);
      const need = (k) => Math.round(cows.reduce((t, c) => t + (plan[c.plan_name]?.[k] || 0), 0));
      const given = (item) => {
        const rows = db.daily_diary.filter((x) => x.shed_id === s.shed_id && x.item_id === item && x.entry_date >= daysAgo(6));
        return Math.round(rows.reduce((t, x) => t + (x.quantity_kg || 0), 0) / 7);
      };
      return { shed: s.shed_name.replace(' Shed', ''), 'Green – needed': need('green_fodder_kg'), 'Green – given': given('FD-01'), 'Concentrate – needed': need('concentrate_kg'), 'Concentrate – given': given('FD-03') };
    });
  }, [db]);

  const doReset = async () => {
    for (const { water_l: _w, note: _n, ...p } of FEED_STANDARDS) {
      if (db.diet_plans.some((x) => x.plan_name === p.plan_name)) await updateRow('diet_plans', p.plan_name, p); else await addRow('diet_plans', p);
    }
    toast('Diet plans reset to standard values');
  };

  return (
    <>
      <PageHead title="Feed & TMR" sub="Standard daily ration per cow and the plans used at the farm">
        {canEdit('/feed') && <button className="btn btn-outline" onClick={() => setReset(true)}><RotateCcw size={15} /> Reset plans to standard</button>}
      </PageHead>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Default recommendation (per cow per day)</div>
        <div className="feed-grid">
          {FEED_STANDARDS.map((s) => (
            <div className="feed-card" key={s.plan_name}>
              <h4>{s.plan_name}</h4>
              <dl className="kv" style={{ gridTemplateColumns: '120px 1fr' }}>
                <dt>Green fodder</dt><dd>{s.green_fodder_kg} kg</dd>
                <dt>Dry fodder</dt><dd>{s.dry_fodder_kg} kg</dd>
                <dt>Concentrate</dt><dd>{s.concentrate_kg} kg</dd>
                <dt>Mineral mix</dt><dd>{s.mineral_kg * 1000} g</dd>
                <dt>Water</dt><dd>{s.water_l} L</dd>
              </dl>
              <p className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>💡 {s.note}</p>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 10 }}>General guideline for Indian desi cows (approx. 350–400 kg body weight). The vet / manager can change the plans below for this farm.</p>
      </div>

      <div className="card-title" style={{ marginTop: 6 }}>Diet plans used at the farm</div>
      <DataTable config={planConfig} />

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Shed-wise feed per day – needed (as per plan) vs given (Daily Diary, last 7 days avg, kg)</div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={shedFeed} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E6EEE0" vertical={false} />
              <XAxis dataKey="shed" tick={{ fontSize: 11, fill: '#6B7A72' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7A72' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `${v} kg`} contentStyle={{ borderRadius: 10, border: '1px solid #DCE6D3' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Green – needed" fill="#1baf7a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Green – given" fill="#2a78d6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Concentrate – needed" fill="#eda100" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Concentrate – given" fill="#eb6834" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {reset && <Confirm title="Reset to standard" confirmLabel="Reset" text="All diet plans will be set back to the standard values shown above." onClose={() => setReset(false)} onConfirm={doReset} />}
    </>
  );
}
