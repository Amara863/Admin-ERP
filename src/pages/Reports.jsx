// Reports & Analytics for Director / Manager / Supervisor (+ Vet: milk & health).
// Everything here is calculated from the tables – nothing extra is stored.
import { useCallback, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';
import { Milk, Beef, Trophy, Gauge, AlertTriangle, CheckCircle2, IndianRupee, Leaf } from 'lucide-react';
import { useStore, rupee } from '../context/StoreContext';
import { PageHead, StatCard, Badge } from '../components/UI';
import { cowsInStock, lactations, periodKey, periodLabel, inPeriod, orderTotal, daysAgo } from '../data/calc';
import { BREED_EXPECTED_MILK } from '../data/standards';
import ReportDownload from './ReportDownload';

const C = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#7c5cd6'];
const GREEN = '#388C5B';
const grid = <CartesianGrid stroke="#EEF1EE" vertical={false} />;
const tick = { fontSize: 11, fill: '#6B7A72' };
const tip = { contentStyle: { borderRadius: 10, border: '1px solid #DCE6D3', fontSize: 12 } };
const r1 = (x) => Math.round(x * 10) / 10;
const CATS = ['Feed purchase', 'Medicine purchase', 'Salary', 'Electricity', 'Repair', 'Other'];
const TABS = ['Milk & Cows', 'Sheds', 'Workers', 'Feed, Gobar & By-products', 'Expenses', 'Sales', 'Download / Print'];

function ChartCard({ title, sub, children, h = 280 }) {
  return (
    <div className="card chart-card">
      <div className="card-title"><span>{title}{sub && <div className="muted" style={{ fontWeight: 400 }}>{sub}</div>}</span></div>
      <div style={{ height: h }}><ResponsiveContainer>{children}</ResponsiveContainer></div>
    </div>
  );
}

export default function Reports() {
  const { db, can, user } = useStore();
  const [tab, setTab] = useState(0);
  const [period, setPeriod] = useState('monthly');
  const [shed, setShed] = useState('All');
  const tabs = TABS.filter((t) => (t === 'Sales' || t === 'Expenses' ? can('/orders') || user.role === 'Director' : true))
    .filter((t) => user.role !== 'Vet Doctor' || ['Milk & Cows', 'Sheds', 'Download / Print'].includes(t));
  const cur = tabs[Math.min(tab, tabs.length - 1)];

  const base = useMemo(() => {
    const herd = cowsInStock(db).filter((c) => c.shed_id);
    const cowShed = Object.fromEntries(db.cows.map((c) => [c.cow_id, c.shed_id]));
    const cowById = Object.fromEntries(db.cows.map((c) => [c.cow_id, c]));
    const price = Object.fromEntries(db.items.map((i) => [i.item_id, i.price]));
    const healthShed = Object.fromEntries(db.health_records.map((h) => [h.cow_id + h.check_date, h._shed || cowShed[h.cow_id]]));
    return { herd, cowShed, cowById, price, healthShed };
  }, [db]);

  const inShed = useCallback((sid) => shed === 'All' || sid === shed, [shed]);
  const keys = useCallback((dates) => [...new Set(dates)].sort(), []);

  return (
    <>
      <PageHead title="Reports & Analytics" sub="Milk, cows, sheds, workers, feed, gobar, expenses and sales – with graphs">
        {cur !== 'Download / Print' && <>
        <select className="input" style={{ width: 'auto' }} value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="daily">Daily (last 30 days)</option>
          <option value="monthly">Monthly (last 12 months)</option>
          <option value="yearly">Yearly</option>
        </select>
        <select className="input" style={{ width: 'auto' }} value={shed} onChange={(e) => setShed(e.target.value)}>
          <option value="All">All sheds</option>
          {db.sheds.map((s) => <option key={s.shed_id} value={s.shed_id}>{s.shed_name}</option>)}
        </select>
        </>}
      </PageHead>
      <div className="tabs-line">
        {tabs.map((t, i) => <button key={t} className={cur === t ? 'active' : ''} onClick={() => setTab(i)}>{t}</button>)}
      </div>
      {cur === 'Milk & Cows' && <MilkReport {...{ db, base, period, inShed, keys }} />}
      {cur === 'Sheds' && <ShedReport {...{ db, base }} />}
      {cur === 'Workers' && <WorkerReport {...{ db, period, inShed }} />}
      {cur === 'Feed, Gobar & By-products' && <FeedReport {...{ db, base, period, inShed, keys }} />}
      {cur === 'Expenses' && <ExpenseReport {...{ db, base, period, inShed, keys }} />}
      {cur === 'Sales' && <SalesReport {...{ db, period, keys }} />}
      {cur === 'Download / Print' && <ReportDownload />}
    </>
  );
}

// ---------------- 1. MILK & COWS ----------------
function MilkReport({ db, base, period, inShed, keys }) {
  const d = useMemo(() => {
    const rows = db.milk_production.filter((m) => inPeriod(m.milk_date, period) && inShed(base.cowShed[m.cow_id]));
    const ks = keys(rows.map((m) => periodKey(m.milk_date, period)));
    const byKey = {}; const daysByKey = {};
    rows.forEach((m) => { const k = periodKey(m.milk_date, period); byKey[k] = (byKey[k] || 0) + m.quantity_ltr; (daysByKey[k] ||= new Set()).add(m.milk_date); });
    const trend = ks.map((k) => ({ label: periodLabel(k, period), 'Total milk (L)': Math.round(byKey[k]), 'Per day (L)': Math.round(byKey[k] / daysByKey[k].size) }));
    // per cow
    const cow = {};
    rows.forEach((m) => { const c = (cow[m.cow_id] ||= { total: 0, days: new Set(), fat: 0, n: 0 }); c.total += m.quantity_ltr; c.days.add(m.milk_date); c.fat += m.fat_pct; c.n++; });
    const cows = Object.entries(cow).map(([id, c]) => {
      const x = base.cowById[id];
      return { id, name: x.cow_name, breed: x.breed, shed: x.shed_id, avg: r1(c.total / c.days.size), total: Math.round(c.total), fat: r1(c.fat / c.n), lact: lactations(db, id), exp: BREED_EXPECTED_MILK[x.breed] || 6 };
    }).sort((a, b) => b.avg - a.avg);
    // per shed
    const sh = {};
    cows.forEach((c) => { const s = (sh[c.shed] ||= { sum: 0, n: 0, exp: 0 }); s.sum += c.avg; s.n++; s.exp += c.exp; });
    const sheds = Object.entries(sh).map(([id, s]) => ({ shed: db.sheds.find((x) => x.shed_id === id)?.shed_name || id, 'Avg per cow (L/day)': r1(s.sum / s.n), 'Breed standard (L/day)': r1(s.exp / s.n) }));
    // per breed
    const br = {};
    cows.forEach((c) => { const b = (br[c.breed] ||= { sum: 0, n: 0 }); b.sum += c.avg; b.n++; });
    const breeds = Object.entries(br).map(([b, x]) => ({ breed: b, 'Actual avg': r1(x.sum / x.n), Standard: BREED_EXPECTED_MILK[b] || 6, cows: x.n }));
    const totalDays = new Set(rows.map((m) => m.milk_date)).size || 1;
    const total = rows.reduce((s, m) => s + m.quantity_ltr, 0);
    const lactating = base.herd.filter((c) => c.cow_type === 'Milking cow' && inShed(c.shed_id));
    const topLact = base.herd.filter((c) => c.gender === 'Female' && inShed(c.shed_id)).map((c) => ({ ...c, lact: lactations(db, c.cow_id), avg: cows.find((x) => x.id === c.cow_id)?.avg })).sort((a, b) => b.lact - a.lact).slice(0, 8);
    return { trend, cows, sheds, breeds, total, perDay: total / totalDays, lactating, topLact };
  }, [db, base, period, inShed, keys]);

  const best = d.cows[0];
  const avgCow = d.cows.length ? d.cows.reduce((s, c) => s + c.avg, 0) / d.cows.length : 0;
  return (
    <>
      <div className="stats">
        <StatCard icon={Beef} label="Cows in lactation (milking)" value={d.lactating.length} note={`${d.lactating.filter((c) => c.status === 'Sick').length} of them sick`} />
        <StatCard icon={Milk} label="Total milk in period" value={`${Math.round(d.total).toLocaleString('en-IN')} L`} note={`${Math.round(d.perDay)} L per day`} />
        <StatCard icon={Gauge} label="Avg production per cow" value={`${r1(avgCow)} L/day`} />
        <StatCard icon={Trophy} label="Highest producing cow" value={best ? best.name : '—'} note={best ? `${best.avg} L/day · ${best.breed} · ${best.id}` : ''} trend="up" />
      </div>
      <div className="grid-2-equal">
        <ChartCard title="Milk production trend" sub={period === 'daily' ? 'Litres per day' : 'Total litres per period'}>
          <LineChart data={d.trend} margin={{ left: -6, right: 10, top: 8 }}>
            {grid}<XAxis dataKey="label" tick={tick} /><YAxis tick={tick} /><Tooltip {...tip} />
            <Line dataKey="Total milk (L)" stroke={GREEN} strokeWidth={2} dot={period !== 'daily'} />
          </LineChart>
        </ChartCard>
        <ChartCard title="Average production of each shed" sub="Litres per cow per day vs breed standard">
          <BarChart data={d.sheds} margin={{ left: -6, right: 10, top: 8 }}>
            {grid}<XAxis dataKey="shed" tick={tick} /><YAxis tick={tick} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Bar dataKey="Avg per cow (L/day)" fill={C[0]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Breed standard (L/day)" fill="#C9D3CC" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>
      <div className="grid-2-equal">
        <ChartCard title="Top 10 cows – who gives the most milk" sub="Average litres per day" h={320}>
          <BarChart data={d.cows.slice(0, 10).map((c) => ({ cow: `${c.name} (${c.breed})`, 'L/day': c.avg }))} layout="vertical" margin={{ left: 40, right: 16 }}>
            {grid}<XAxis type="number" tick={tick} /><YAxis type="category" dataKey="cow" tick={tick} width={130} /><Tooltip {...tip} />
            <Bar dataKey="L/day" fill={GREEN} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Breed-wise production" sub="Actual average vs breed standard (L/day)" h={320}>
          <BarChart data={d.breeds} margin={{ left: -6, right: 10, top: 8 }}>
            {grid}<XAxis dataKey="breed" tick={tick} /><YAxis tick={tick} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Bar dataKey="Actual avg" fill={C[2]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Standard" fill="#C9D3CC" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>
      <div className="grid-2-equal">
        <div className="card">
          <div className="card-title">Cow report – milk per cow</div>
          <div className="table-wrap" style={{ maxHeight: 380, overflowY: 'auto' }}>
            <table className="table">
              <thead><tr><th>Cow</th><th>Breed</th><th className="num">Avg L/day</th><th className="num">vs standard</th><th className="num">Fat %</th><th className="num">Total L</th></tr></thead>
              <tbody>
                {d.cows.map((c) => (
                  <tr key={c.id}><td className="strong">{c.name} <span className="muted">{c.id}</span></td><td>{c.breed}</td><td className="num">{c.avg}</td>
                    <td className="num"><Badge tone={c.avg >= c.exp * 0.9 ? 'green' : c.avg >= c.exp * 0.75 ? 'amber' : 'red'}>{Math.round((c.avg / c.exp) * 100)}%</Badge></td>
                    <td className="num">{c.fat}</td><td className="num">{c.total.toLocaleString('en-IN')}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Highest lactation cows (most calvings)</div>
          <div style={{ overflowX: 'auto' }}><table className="table">
            <thead><tr><th>Cow</th><th>Breed</th><th>Type</th><th className="num">Lactations</th><th className="num">Avg L/day</th></tr></thead>
            <tbody>
              {d.topLact.map((c) => (
                <tr key={c.cow_id}><td className="strong">{c.cow_name} <span className="muted">{c.cow_id}</span></td><td>{c.breed}</td><td><Badge>{c.cow_type}</Badge></td><td className="num strong">{c.lact}</td><td className="num">{c.avg ?? '—'}</td></tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>
    </>
  );
}

// ---------------- 2. SHEDS – which shed is doing badly and why ----------------
function ShedReport({ db, base }) {
  const from = daysAgo(29);
  const rows = useMemo(() => {
    const plan = Object.fromEntries(db.diet_plans.map((p) => [p.plan_name, p]));
    return db.sheds.filter((s) => s.shed_type !== 'Store').map((s) => {
      const cows = base.herd.filter((c) => c.shed_id === s.shed_id);
      const milk = db.milk_production.filter((m) => m.milk_date >= from && base.cowShed[m.cow_id] === s.shed_id);
      const milkCows = [...new Set(milk.map((m) => m.cow_id))];
      const days = new Set(milk.map((m) => m.milk_date)).size || 1;
      const avg = milkCows.length ? milk.reduce((t, m) => t + m.quantity_ltr, 0) / days / milkCows.length : null;
      const exp = milkCows.length ? milkCows.reduce((t, id) => t + (BREED_EXPECTED_MILK[base.cowById[id].breed] || 6), 0) / milkCows.length : null;
      const tasks = db.daily_diary.filter((x) => x.shed_id === s.shed_id && x.entry_date >= from && x.status);
      const onTime = tasks.length ? tasks.filter((x) => x.status === 'Done').length / tasks.length : 1;
      const missed = tasks.filter((x) => x.status === 'Missed').length;
      const needGreen = cows.reduce((t, c) => t + (plan[c.plan_name]?.green_fodder_kg || 0), 0) * 30;
      const gaveGreen = db.daily_diary.filter((x) => x.shed_id === s.shed_id && x.entry_date >= from && x.item_id === 'FD-01').reduce((t, x) => t + (x.quantity_kg || 0), 0);
      const feedPct = needGreen ? gaveGreen / needGreen : 1;
      const sick = db.health_records.filter((h) => h.check_date >= from && h.condition === 'Sick' && base.healthShed[h.cow_id + h.check_date] === s.shed_id).length;
      const udder = milk.length ? milk.filter((m) => m.udder_cleaned).length / milk.length : null;
      const reasons = [];
      if (avg != null && avg < exp * 0.9) reasons.push(`Milk ${Math.round((1 - avg / exp) * 100)}% below breed standard`);
      if (feedPct < 0.9) reasons.push(`Green fodder only ${Math.round(feedPct * 100)}% of diet plan (input)`);
      if (onTime < 0.8) reasons.push(`Only ${Math.round(onTime * 100)}% tasks on time, ${missed} missed (workers / labour)`);
      if (udder != null && udder < 0.9) reasons.push(`Udder cleaned in only ${Math.round(udder * 100)}% milkings → mastitis risk`);
      if (cows.length && sick / cows.length > 0.4) reasons.push(`${sick} sick cases in 30 days (cow health)`);
      const verdict = s.shed_type === 'Hospital' ? 'OK' : reasons.length >= 2 ? 'Needs attention' : reasons.length === 1 ? 'Average' : 'Good';
      return { s, cows: cows.length, avg, exp, onTime, missed, feedPct, sick, udder, reasons, verdict, sup: db.staff.find((x) => x.staff_id === s.supervisor_id)?.name };
    });
  }, [db, base, from]);
  const chart = rows.map((r) => ({ shed: r.s.shed_name.replace(' Shed', ''), 'Milk vs standard': r.avg ? Math.round((r.avg / r.exp) * 100) : null,
    'Feed given': Math.round(r.feedPct * 100), 'Tasks on time': Math.round(r.onTime * 100), 'Udder cleaned': r.udder != null ? Math.round(r.udder * 100) : null }));
  return (
    <>
      <p className="muted" style={{ marginBottom: 12 }}>Last 30 days. A shed is checked on 4 things: worker / labour (tasks on time), input (feed vs plan), cow health (sick cases) and hygiene (udder cleaning).</p>
      <ChartCard title="Shed comparison (100% = as per standard)" h={300}>
        <BarChart data={chart} margin={{ left: -6, right: 10, top: 8 }}>
          {grid}<XAxis dataKey="shed" tick={tick} /><YAxis tick={tick} /><Tooltip {...tip} formatter={(v) => `${v}%`} /><Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          <Bar dataKey="Milk vs standard" fill={C[0]} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Feed given" fill={C[2]} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Tasks on time" fill={C[3]} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Udder cleaned" fill={C[4]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>
      <div className="feed-grid" style={{ marginTop: 16 }}>
        {rows.map((r) => (
          <div className="feed-card" key={r.s.shed_id}>
            <h4 style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>{r.s.shed_name} <Badge>{r.verdict}</Badge></h4>
            <div className="muted" style={{ marginBottom: 8 }}>Supervisor: {r.sup || '—'} · {r.cows} cows</div>
            <dl className="kv" style={{ gridTemplateColumns: '130px 1fr', fontSize: 13 }}>
              <dt>Milk / cow / day</dt><dd>{r.avg != null ? `${r1(r.avg)} L (std ${r1(r.exp)})` : '—'}</dd>
              <dt>Feed given</dt><dd>{Math.round(r.feedPct * 100)}% of plan</dd>
              <dt>Tasks on time</dt><dd>{Math.round(r.onTime * 100)}% · {r.missed} missed</dd>
              <dt>Sick cases</dt><dd>{r.sick}</dd>
            </dl>
            <div style={{ marginTop: 10 }}>
              {r.reasons.length ? r.reasons.map((x) => <div className="insight bad" key={x}><AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />{x}</div>)
                : <div className="insight good"><CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 2 }} />Working as per standard</div>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------- 3. WORKERS ----------------
function WorkerReport({ db, period, inShed }) {
  const rows = useMemo(() => {
    const t = {};
    db.daily_diary.forEach((x) => {
      if (!x.done_by || !x.status || !inPeriod(x.entry_date, period) || !inShed(x.shed_id)) return;
      const w = (t[x.done_by] ||= { Done: 0, Delayed: 0, Missed: 0 }); w[x.status]++;
    });
    return Object.entries(t).map(([id, w]) => {
      const s = db.staff.find((x) => x.staff_id === id);
      const total = w.Done + w.Delayed + w.Missed;
      const score = Math.round(((w.Done + w.Delayed * 0.5) / total) * 100);
      return { id, name: s?.name || id, role: s?.role, shed: db.sheds.find((x) => x.shed_id === s?.shed_id)?.shed_name || '—', ...w, total, score, ot: s?.overtime_hours ?? 0,
        rating: score >= 92 ? 'Good' : score >= 82 ? 'Average' : 'Poor' };
    }).sort((a, b) => b.score - a.score);
  }, [db, period, inShed]);
  const good = rows.filter((r) => r.rating === 'Good').length;
  const poor = rows.filter((r) => r.rating === 'Poor');
  return (
    <>
      <div className="stats">
        <StatCard icon={CheckCircle2} label="Good workers" value={good} note="score 92+" trend="up" />
        <StatCard icon={Gauge} label="Average" value={rows.length - good - poor.length} note="score 82–91" />
        <StatCard icon={AlertTriangle} label="Need improvement" value={poor.length} note={poor.slice(0, 3).map((p) => p.name.split(' ')[0]).join(', ')} trend="down" />
      </div>
      <ChartCard title="Worker performance score" sub="Score = (Done + ½ × Delayed) ÷ all tasks · from Daily Diary" h={Math.max(260, rows.length * 26)}>
        <BarChart data={rows.map((r) => ({ worker: `${r.name} (${r.role})`, Score: r.score, rating: r.rating }))} layout="vertical" margin={{ left: 60, right: 20 }}>
          {grid}<XAxis type="number" domain={[0, 100]} tick={tick} /><YAxis type="category" dataKey="worker" width={170} tick={tick} /><Tooltip {...tip} />
          <Bar dataKey="Score" radius={[0, 4, 4, 0]}>
            {rows.map((r) => <Cell key={r.id} fill={r.rating === 'Good' ? GREEN : r.rating === 'Average' ? '#eda100' : '#C0392B'} />)}
          </Bar>
        </BarChart>
      </ChartCard>
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table className="table">
          <thead><tr><th>Worker</th><th>Shed</th><th className="num">Tasks</th><th className="num">On time</th><th className="num">Delayed</th><th className="num">Missed</th><th className="num">Overtime (h)</th><th className="num">Score</th><th>Rating</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}><td className="strong">{r.name}<div className="muted">{r.role}</div></td><td>{r.shed}</td><td className="num">{r.total}</td>
                <td className="num">{r.Done}</td><td className="num">{r.Delayed}</td><td className="num">{r.Missed}</td><td className="num">{r.ot}</td><td className="num strong">{r.score}</td><td><Badge>{r.rating}</Badge></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------- 4. FEED, GOBAR & BY-PRODUCTS ----------------
function FeedReport({ db, base, period, inShed, keys }) {
  const d = useMemo(() => {
    const rows = db.daily_diary.filter((x) => inPeriod(x.entry_date, period) && inShed(x.shed_id) && x.shed_id && x.quantity_kg);
    const sheds = db.sheds.filter((s) => s.shed_type !== 'Store' && inShed(s.shed_id));
    const ks = keys(rows.map((x) => periodKey(x.entry_date, period)));
    const gobar = ks.map((k) => {
      const o = { label: periodLabel(k, period) };
      sheds.forEach((s) => { o[s.shed_name] = Math.round(rows.filter((x) => x.entry_type === 'Dung removal' && x.shed_id === s.shed_id && periodKey(x.entry_date, period) === k).reduce((t, x) => t + x.quantity_kg, 0)); });
      return o;
    });
    const days = new Set(rows.map((x) => x.entry_date)).size || 1;
    const perShed = sheds.map((s) => {
      const cows = base.herd.filter((c) => c.shed_id === s.shed_id).length || 1;
      const sum = (pred) => rows.filter((x) => x.shed_id === s.shed_id && pred(x)).reduce((t, x) => t + x.quantity_kg, 0);
      return { shed: s.shed_name.replace(' Shed', ''), 'Green fodder / cow / day (kg)': r1(sum((x) => x.item_id === 'FD-01') / days / cows),
        'Dry fodder / cow / day (kg)': r1(sum((x) => x.item_id === 'FD-02') / days / cows), 'Gobar / cow / day (kg)': r1(sum((x) => x.entry_type === 'Dung removal') / days / cows),
        totalGreen: Math.round(sum((x) => x.item_id === 'FD-01')), totalGobar: Math.round(sum((x) => x.entry_type === 'Dung removal')) };
    });
    const prod = {};
    db.production_log.filter((p) => inPeriod(p.start_date, period)).forEach((p) => {
      const v = db.product_variants.find((x) => x.variant_id === p.byproduct_id);
      const name = db.products.find((x) => x.product_id === v?.product_id)?.product_name || p.byproduct_id;
      const o = (prod[name] ||= { product: name, Output: 0, input: 0, unit: p.input_unit, mat: p.input_material }); o.Output += Number(p.output_qty); o.input += Number(p.input_qty);
    });
    return { gobar, perShed, sheds, prod: Object.values(prod).sort((a, b) => b.Output - a.Output) };
  }, [db, base, period, inShed, keys]);
  const totalGobar = d.perShed.reduce((t, x) => t + x.totalGobar, 0);
  const totalGreen = d.perShed.reduce((t, x) => t + x.totalGreen, 0);
  return (
    <>
      <div className="stats">
        <StatCard icon={Leaf} label="Green fodder given" value={`${(totalGreen / 1000).toFixed(1)} t`} note="in selected period" />
        <StatCard icon={Beef} label="Gobar collected" value={`${(totalGobar / 1000).toFixed(1)} t`} note="from Daily Diary (dung removal)" />
        <StatCard icon={Gauge} label="Biogas made" value={`${d.prod.find((p) => p.product === 'Biogas')?.Output || 0} m³`} />
      </div>
      <div className="grid-2-equal">
        <ChartCard title="Average grass (fodder) given in each shed" sub="kg per cow per day">
          <BarChart data={d.perShed} margin={{ left: -6, right: 10, top: 8 }}>
            {grid}<XAxis dataKey="shed" tick={tick} /><YAxis tick={tick} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Bar dataKey="Green fodder / cow / day (kg)" fill={C[2]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Dry fodder / cow / day (kg)" fill={C[3]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Gobar production by shed" sub="kg collected per period">
          <BarChart data={d.gobar} margin={{ left: 0, right: 10, top: 8 }}>
            {grid}<XAxis dataKey="label" tick={tick} /><YAxis tick={tick} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
            {d.sheds.map((s, i) => <Bar key={s.shed_id} dataKey={s.shed_name} stackId="g" fill={C[i % C.length]} />)}
          </BarChart>
        </ChartCard>
      </div>
      <div className="grid-2-equal">
        <ChartCard title="By-products made" sub="Output units in selected period">
          <BarChart data={d.prod} layout="vertical" margin={{ left: 50, right: 16 }}>
            {grid}<XAxis type="number" tick={tick} /><YAxis type="category" dataKey="product" width={150} tick={tick} /><Tooltip {...tip} />
            <Bar dataKey="Output" fill={GREEN} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>
        <div className="card">
          <div className="card-title">Shed-wise feed & gobar (totals)</div>
          <div style={{ overflowX: 'auto' }}><table className="table">
            <thead><tr><th>Shed</th><th className="num">Green kg</th><th className="num">Green / cow / day</th><th className="num">Gobar kg</th><th className="num">Gobar / cow / day</th></tr></thead>
            <tbody>{d.perShed.map((x) => <tr key={x.shed}><td className="strong">{x.shed}</td><td className="num">{x.totalGreen.toLocaleString('en-IN')}</td><td className="num">{x['Green fodder / cow / day (kg)']}</td><td className="num">{x.totalGobar.toLocaleString('en-IN')}</td><td className="num">{x['Gobar / cow / day (kg)']}</td></tr>)}</tbody>
          </table></div>
        </div>
      </div>
    </>
  );
}

// ---------------- 5. EXPENSES ----------------
function ExpenseReport({ db, base, period, inShed, keys }) {
  const d = useMemo(() => {
    const rows = db.purchases_expenses.filter((x) => inPeriod(x.txn_date, period));
    const ks = keys(rows.map((x) => periodKey(x.txn_date, period)));
    const trend = ks.map((k) => {
      const o = { label: periodLabel(k, period) };
      CATS.forEach((c) => { o[c] = Math.round(rows.filter((x) => x.category === c && periodKey(x.txn_date, period) === k).reduce((t, x) => t + x.amount, 0)); });
      return o;
    });
    const byCat = CATS.map((c) => ({ cat: c, amount: rows.filter((x) => x.category === c).reduce((t, x) => t + x.amount, 0) }));
    // shed-wise: feed used (diary qty × price) and medicine used (treatments × price)
    const shed = db.sheds.filter((s) => s.shed_type !== 'Store' && inShed(s.shed_id)).map((s) => {
      const feed = db.daily_diary.filter((x) => x.shed_id === s.shed_id && x.item_id && x.quantity_kg && inPeriod(x.entry_date, period)).reduce((t, x) => t + x.quantity_kg * (base.price[x.item_id] || 0), 0);
      const med = db.treatments.filter((t) => inPeriod(t.check_date, period) && base.healthShed[t.cow_id + t.check_date] === s.shed_id).reduce((t, x) => t + (x._qty || 1) * (base.price[x.item_id] || 0), 0);
      return { shed: s.shed_name.replace(' Shed', ''), 'Feed cost': Math.round(feed), 'Medicine cost': Math.round(med) };
    });
    return { trend, byCat, shed, total: rows.reduce((t, x) => t + x.amount, 0) };
  }, [db, base, period, inShed, keys]);
  return (
    <>
      <div className="stats">
        <StatCard icon={IndianRupee} label="Total expenses" value={rupee(d.total)} note={period === 'daily' ? 'last 30 days' : period === 'monthly' ? 'last 12 months' : 'all years'} />
        {d.byCat.slice(0, 3).map((c) => <StatCard key={c.cat} icon={IndianRupee} label={c.cat} value={rupee(c.amount)} note={`${d.total ? Math.round((c.amount / d.total) * 100) : 0}% of total`} />)}
      </div>
      <ChartCard title={`Expenses – ${period}`} sub="Feed, medicine and miscellaneous, stacked" h={320}>
        <BarChart data={d.trend} margin={{ left: 10, right: 10, top: 8 }}>
          {grid}<XAxis dataKey="label" tick={tick} /><YAxis tick={tick} tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
          <Tooltip {...tip} formatter={(v) => rupee(v)} /><Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          {CATS.map((c, i) => <Bar key={c} dataKey={c} stackId="e" fill={C[i % C.length]} />)}
        </BarChart>
      </ChartCard>
      <div className="grid-2-equal" style={{ marginTop: 16 }}>
        <ChartCard title="Shed-wise feed and medicine cost" sub="Feed used (Daily Diary) and medicine given (Treatments) × item price">
          <BarChart data={d.shed} margin={{ left: 10, right: 10, top: 8 }}>
            {grid}<XAxis dataKey="shed" tick={tick} /><YAxis tick={tick} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} /><Tooltip {...tip} formatter={(v) => rupee(v)} /><Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Bar dataKey="Feed cost" fill={C[2]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Medicine cost" fill={C[1]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <div className="card">
          <div className="card-title">Category-wise total</div>
          <div style={{ overflowX: 'auto' }}><table className="table">
            <thead><tr><th>Category</th><th className="num">Amount</th><th className="num">Share</th></tr></thead>
            <tbody>{d.byCat.map((c) => <tr key={c.cat}><td className="strong">{c.cat}</td><td className="num">{rupee(c.amount)}</td><td className="num">{d.total ? Math.round((c.amount / d.total) * 100) : 0}%</td></tr>)}</tbody>
          </table></div>
        </div>
      </div>
    </>
  );
}

// ---------------- 6. SALES ----------------
function SalesReport({ db, period, keys }) {
  const d = useMemo(() => {
    const orders = db.orders.filter((o) => o.delivery_status !== 'Cancelled' && inPeriod(o.order_date, period));
    const ks = keys(orders.map((o) => periodKey(o.order_date, period)));
    const trend = ks.map((k) => { const os = orders.filter((o) => periodKey(o.order_date, period) === k); return { label: periodLabel(k, period), Sales: Math.round(os.reduce((t, o) => t + orderTotal(db, o.order_id), 0)), Orders: os.length }; });
    const ids = new Set(orders.map((o) => o.order_id));
    const prod = {};
    db.order_items.filter((i) => ids.has(i.order_id)).forEach((i) => {
      const v = db.product_variants.find((x) => x.variant_id === i.variant_id);
      const n = db.products.find((p) => p.product_id === v?.product_id)?.product_name || i.variant_id;
      prod[n] = (prod[n] || 0) + i.quantity * i.unit_price;
    });
    return { trend, prod: Object.entries(prod).map(([product, Sales]) => ({ product, Sales })).sort((a, b) => b.Sales - a.Sales), total: trend.reduce((t, x) => t + x.Sales, 0), count: orders.length };
  }, [db, period, keys]);
  return (
    <>
      <div className="stats">
        <StatCard icon={IndianRupee} label="Sales" value={rupee(d.total)} />
        <StatCard icon={Gauge} label="Orders" value={d.count} note={`Avg ${rupee(d.count ? d.total / d.count : 0)} per order`} />
        <StatCard icon={Trophy} label="Best product" value={d.prod[0]?.product || '—'} note={d.prod[0] ? rupee(d.prod[0].Sales) : ''} />
      </div>
      <div className="grid-2-equal">
        <ChartCard title="Sales trend">
          <BarChart data={d.trend} margin={{ left: 10, right: 10, top: 8 }}>
            {grid}<XAxis dataKey="label" tick={tick} /><YAxis tick={tick} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} /><Tooltip {...tip} formatter={(v, n) => (n === 'Sales' ? rupee(v) : v)} />
            <Bar dataKey="Sales" fill={GREEN} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Sales by product">
          <BarChart data={d.prod} layout="vertical" margin={{ left: 60, right: 16 }}>
            {grid}<XAxis type="number" tick={tick} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} /><YAxis type="category" dataKey="product" width={150} tick={tick} /><Tooltip {...tip} formatter={(v) => rupee(v)} />
            <Bar dataKey="Sales" fill={C[0]} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </>
  );
}
