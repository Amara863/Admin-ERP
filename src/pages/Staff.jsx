import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { PageHead } from '../components/UI';
import { DataTable } from '../components/TablePage';
import { staffTable } from './tableConfigs';
import { bossOf } from '../data/calc';

function Node({ s, cls, db }) {
  return (
    <div className={`org-node ${cls || ''}`}><b>{s.name}</b>{s.role}{s.role === 'Manager' ? ` – ${s.department}` : ''}{s.shed_id && s.role === 'Supervisor' ? <div className="muted">{db.sheds.filter((x) => x.supervisor_id === s.staff_id).map((x) => x.shed_name).join(', ')}</div> : null}</div>
  );
}

// Hierarchy: Director → Managers (Health, Production, Cultivation & By-products, Purchase, Finance) → Supervisors → Workers
// Vet Doctor is separate (reports to Director). Shed workers' supervisor comes from their shed.
export default function Staff() {
  const { db } = useStore();
  const [tab, setTab] = useState('chart');
  const under = (id) => db.staff.filter((s) => s.staff_id !== id && bossOf(db, s) === id);
  const director = db.staff.find((s) => s.role === 'Director');
  const top = director ? under(director.staff_id) : [];
  const managers = top.filter((s) => s.role === 'Manager');
  const others = top.filter((s) => s.role !== 'Manager');


  return (
    <>
      <PageHead title="Staff & Hierarchy" sub={`${db.staff.length} people · Director → Manager → Supervisor → Worker`} />
      <div className="tabs-line">
        <button className={tab === 'chart' ? 'active' : ''} onClick={() => setTab('chart')}>Hierarchy chart</button>
        <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>All staff (add / edit)</button>
      </div>
      {tab === 'chart' && director && (
        <div className="card org">
          <Node db={db} s={director} cls="dir" />
          <div className="org-line" />
          <div className="org-row">
            {managers.map((m) => {
              const sups = under(m.staff_id);
              return (
                <div className="org-col" key={m.staff_id}>
                  <Node db={db} s={m} cls="mgr" />
                  {sups.map((sp) => {
                    const ws = under(sp.staff_id);
                    return (
                      <div className="org-col" key={sp.staff_id}>
                        <div className="org-line" />
                        <Node db={db} s={sp} />
                        {ws.length > 0 && <div className="org-workers">👷 {ws.map((w) => `${w.name.split(' ')[0]} (${w.role})`).join(', ')}</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <div className="org-col">
              {others.map((o) => (
                <div className="org-col" key={o.staff_id} style={{ marginBottom: 10 }}>
                  <Node db={db} s={o} cls={o.role === 'Vet Doctor' ? 'vet' : ''} />
                  {under(o.staff_id).length > 0 && <div className="org-workers">{under(o.staff_id).map((w) => `${w.name} (${w.role})`).join(', ')}</div>}
                </div>
              ))}
            </div>
          </div>
          <p className="muted" style={{ marginTop: 16 }}>Change the number of workers per supervisor in Settings (demo data). Add / move people from the “All staff” tab.</p>
        </div>
      )}
      {tab === 'list' && <DataTable config={staffTable} />}
    </>
  );
}
