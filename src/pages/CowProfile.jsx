import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore, rupee, fmtDate, ageOf } from '../context/StoreContext';
import { Badge } from '../components/UI';
import { lactations, lastMove, feedingOf, daysAgo } from '../data/calc';
import { BREED_EXPECTED_MILK, FEED_STANDARDS } from '../data/standards';

export default function CowProfile() {
  const { id } = useParams();
  const { db, find, nameOf } = useStore();
  const cow = find('cows', id);
  if (!cow) return <div className="card empty">Cow not found. <Link to="/cows" className="btn-link">Back to list</Link></div>;

  const mother = find('cows', cow.mother_id);
  const father = find('cows', cow.father_id);
  const calves = db.cows.filter((c) => c.mother_id === cow.cow_id || c.father_id === cow.cow_id);
  const health = db.health_records.filter((h) => h.cow_id === cow.cow_id).sort((a, b) => (a.check_date < b.check_date ? 1 : -1));
  const meds = db.treatments.filter((t) => t.cow_id === cow.cow_id);
  const diet = db.diet_plans.find((d) => d.plan_name === cow.plan_name);
  const std = FEED_STANDARDS.find((d) => d.plan_name === cow.plan_name);
  const moves = db.cow_movements.filter((m) => m.cow_id === cow.cow_id).sort((a, b) => (a.movement_date < b.movement_date ? -1 : 1));
  const lm = lastMove(db)[cow.cow_id];
  const out = lm && ['Sold', 'Given away', 'Died'].includes(lm.movement_type);
  const milkRows = db.milk_production.filter((m) => m.cow_id === cow.cow_id);
  const milk30 = Array.from({ length: 30 }, (_, i) => {
    const date = daysAgo(29 - i);
    const day = milkRows.filter((m) => m.milk_date === date);
    return { day: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), litres: +day.reduce((s, m) => s + m.quantity_ltr, 0).toFixed(1) };
  });
  const days = new Set(milkRows.map((m) => m.milk_date)).size;
  const avg = days ? milkRows.reduce((s, m) => s + m.quantity_ltr, 0) / days : 0;
  const fat = milkRows.length ? milkRows.reduce((s, m) => s + m.fat_pct, 0) / milkRows.length : 0;
  const feed = cow.shed_id ? feedingOf(db, cow.shed_id) : null;
  const cowLink = (c) => (c ? <Link to={`/cows/${c.cow_id}`} className="btn-link">{(c.cow_name || c.tag_number)} ({c.cow_id})</Link> : '—');

  return (
    <>
      <div className="crumb"><Link to="/cows"><ArrowLeft size={13} style={{ verticalAlign: -2 }} /> Back to all cows</Link></div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="profile-head">
          <div className="cow-avatar">{cow.cow_type === 'Calf' ? '🐮' : cow.gender === 'Male' ? '🐂' : '🐄'}</div>
          <div style={{ flex: 1 }}>
            <h1 className="page-title">{(cow.cow_name || cow.tag_number)} <span className="muted" style={{ fontSize: 15 }}>{cow.cow_id} · {cow.tag_number}</span></h1>
            <p className="page-sub">{cow.breed} · {cow.gender} · {ageOf(cow.dob)} · {out ? `${lm.movement_type} on ${fmtDate(lm.movement_date)}` : nameOf('sheds', cow.shed_id)}</p>
          </div>
          <Badge>{cow.cow_type}</Badge> <Badge>{cow.status}</Badge>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div><div className="stat-label">Avg milk / day</div><div className="stat-value">{avg ? avg.toFixed(1) + ' L' : '—'}</div><div className="stat-note">Breed standard {BREED_EXPECTED_MILK[cow.breed] || '—'} L</div></div></div>
        <div className="stat"><div><div className="stat-label">Avg fat %</div><div className="stat-value">{fat ? fat.toFixed(1) + '%' : '—'}</div></div></div>
        <div className="stat"><div><div className="stat-label">Lactations (calvings)</div><div className="stat-value">{cow.gender === 'Female' ? lactations(db, cow.cow_id) : '—'}</div></div></div>
        <div className="stat"><div><div className="stat-label">Fed today?</div><div className="stat-value" style={{ fontSize: 18, marginTop: 6 }}>{feed ? <Badge tone={{ Done: 'green', Delayed: 'amber', Missed: 'red' }[feed.state]}>{feed.state}</Badge> : '—'}</div>
          {feed?.rows.map((x) => <div className="muted" key={x.entry_id}>{x.remarks}: {x.status}</div>)}</div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Milk – last 30 days</div>
          {milkRows.length ? (
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={milk30} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#E6EEE0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B7A72' }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7A72' }} axisLine={false} tickLine={false} unit=" L" />
                  <Tooltip formatter={(v) => [`${v} L`, 'Milk']} contentStyle={{ borderRadius: 10, border: '1px solid #DCE6D3' }} />
                  <Line type="monotone" dataKey="litres" stroke="#388C5B" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="empty">This cow is not giving milk right now.</div>}
        </div>
        <div className="card">
          <div className="card-title">Details</div>
          <dl className="kv">
            <dt>Date of birth</dt><dd>{fmtDate(cow.dob)}</dd>
            <dt>Mother</dt><dd>{cowLink(mother)}</dd>
            <dt>Father</dt><dd>{cowLink(father)}</dd>
            <dt>Birth type</dt><dd>{cow.birth_type || '—'}</dd>
            <dt>Insemination</dt><dd>{fmtDate(cow.insemination_date)}</dd>
            <dt>Expected delivery</dt><dd>{cow.insemination_date ? fmtDate(new Date(new Date(cow.insemination_date).getTime() + 283 * 86400000).toISOString()) : '—'}</dd>
            <dt>Shed supervisor</dt><dd>{nameOf('staff', find('sheds', cow.shed_id)?.supervisor_id)}</dd>
          </dl>
        </div>
      </div>

      <div className="grid-2-equal">
        <div className="card">
          <div className="card-title">Health history <Link to="/health">All records →</Link></div>
          {health.length ? health.slice(0, 8).map((h) => (
            <div className="list-item" key={h.check_date}>
              <div style={{ flex: 1 }}>
                <div className="strong">{h.condition}{h.disease_name ? `: ${h.disease_name}` : ''}</div>
                <div className="muted">{fmtDate(h.check_date)} · {nameOf('staff', h.vet_doctor_id)}{h.cause ? ` · cause: ${h.cause}` : ''}</div>
                {meds.filter((t) => t.check_date === h.check_date).map((t) => (
                  <div className="muted" key={t.item_id}>💊 {nameOf('items', t.item_id)} – {t.dosage}</div>
                ))}
              </div>
              {h.economic_loss ? <span className="muted">{rupee(h.economic_loss)} loss</span> : null}
            </div>
          )) : <div className="muted">No health records.</div>}
        </div>
        <div className="card">
          <div className="card-title">Diet plan – {cow.plan_name || '—'} <Link to="/feed">All plans →</Link></div>
          {diet ? (
            <dl className="kv">
              <dt>Green fodder</dt><dd>{diet.green_fodder_kg} kg / day</dd>
              <dt>Dry fodder</dt><dd>{diet.dry_fodder_kg} kg / day</dd>
              <dt>Concentrate</dt><dd>{diet.concentrate_kg} kg / day</dd>
              <dt>Mineral</dt><dd>{diet.mineral_kg} kg / day</dd>
              {std && <><dt>Water</dt><dd>{std.water_l} L / day</dd><dt>Tip</dt><dd className="muted">{std.note}</dd></>}
            </dl>
          ) : <div className="muted">No plan.</div>}

          <div className="card-title" style={{ marginTop: 20 }}>Stock history (in / out)</div>
          {moves.length ? moves.map((m) => (
            <div className="list-item" key={m.movement_date}>
              <div style={{ flex: 1 }}><Badge>{m.movement_type}</Badge> <span className="muted">{fmtDate(m.movement_date)} · {m.remarks}</span></div>
              {m.amount ? <span>{rupee(m.amount)}</span> : null}
            </div>
          )) : <div className="muted">Born at the farm.</div>}

          <div className="card-title" style={{ marginTop: 20 }}>Calves / offspring ({calves.length})</div>
          {calves.length ? calves.map((c) => (
            <div className="list-item" key={c.cow_id}>
              <div style={{ flex: 1 }}>{cowLink(c)}<div className="muted">Born {fmtDate(c.dob)} · {c.birth_type || '—'} birth</div></div>
              <Badge>{c.cow_type}</Badge>
            </div>
          )) : <div className="muted">No calves recorded.</div>}
        </div>
      </div>
    </>
  );
}
