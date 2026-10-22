import { useState } from 'react';
import { RefreshCw, Database } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { PageHead, Confirm } from '../components/UI';
import { DEFAULT_SETTINGS } from '../data/generate';

// Demo data settings: the gaushala can choose how big the random dataset is.
// Later, when real data is entered in Supabase, this page is not needed.
const FIELDS = [
  ['cows', 'Number of cows (approx.)', 10, 500, 'Bulls ~5%, adult cows ~62%, rest calves & heifers'],
  ['workersPerSupervisor', 'Workers under each supervisor', 1, 10, '7 supervisors under 5 managers'],
  ['customers', 'Number of website customers', 5, 300, 'Orders are made for them every day'],
  ['days', 'Days of daily records', 30, 365, 'Milk, diary, orders, health – this many days back'],
  ['seed', 'Random seed', 1, 9999, 'Change it to get a different random dataset']
];

export default function Settings() {
  const { settings, regenerate, db, toast, canEdit, source, setSource, live, reload } = useStore();
  const [f, setF] = useState(settings);
  const [ask, setAsk] = useState(null);
  const editable = canEdit('/settings');
  const counts = [['Cows', db.cows.length], ['Staff', db.staff.length], ['Sheds', db.sheds.length], ['Equipment', db.equipment.length], ['Products', db.products.length],
    ['Customers', db.profiles.length], ['Orders', db.orders.length], ['Milk records', db.milk_production.length], ['Diary entries', db.daily_diary.length],
    ['Health records', db.health_records.length], ['Expenses', db.purchases_expenses.length], ['Login users', db.admin_users.length]];

  return (
    <>
      <PageHead title="Settings" sub="Where the data comes from, and the size of the demo dataset" />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Data source</div>
        <div className="chips" style={{ marginBottom: 10 }}>
          <button className={`chip ${live ? 'active' : ''}`} disabled={!editable} onClick={() => setSource('supabase')}>Supabase (real, saved)</button>
          <button className={`chip ${!live ? 'active' : ''}`} disabled={!editable} onClick={() => setSource('demo')}>Demo data (not saved)</button>
          {live && <button className="btn btn-outline btn-sm" onClick={async () => { await reload(); toast('Data reloaded from Supabase'); }}><RefreshCw size={14} /> Reload</button>}
        </div>
        <p className="muted" style={{ lineHeight: 1.6 }}>{live
          ? 'Every add / edit / delete is saved in the Supabase database. Customers and orders come from the customer website.'
          : 'Random demo data in the browser only – changes are lost on refresh. Use it to try the system.'}</p>
      </div>
      <div className="grid-2">
        <form className="card" onSubmit={(e) => { e.preventDefault(); setAsk({ ...f }); }} style={live ? { opacity: 0.55 } : undefined}>
          <div className="card-title"><span><Database size={16} style={{ verticalAlign: -3 }} /> Dataset size</span></div>
          <div className="form-grid">
            {FIELDS.map(([k, label, min, max, help]) => (
              <div key={k}>
                <label className="label">{label}</label>
                <input className="input" type="number" min={min} max={max} value={f[k]} disabled={!editable}
                  onChange={(e) => setF((x) => ({ ...x, [k]: Math.max(min, Math.min(max, Number(e.target.value) || min)) }))} />
                <div className="muted" style={{ marginTop: 3 }}>{help}</div>
              </div>
            ))}
          </div>
          {editable && !live && (
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button className="btn btn-primary"><RefreshCw size={15} /> Make new demo data</button>
              <button type="button" className="btn btn-outline" onClick={() => setF(DEFAULT_SETTINGS)}>Default values</button>
            </div>
          )}
          <p className="muted" style={{ marginTop: 12, lineHeight: 1.6 }}>Making new data replaces everything you added or changed in this demo. Products, sheds, equipment and diet plans can also be changed on their own pages.</p>
        </form>
        <div className="card">
          <div className="card-title">{live ? 'Rows in Supabase' : 'Current demo data'}</div>
          {counts.map(([k, v]) => <div className="list-item" key={k} style={{ padding: '7px 0' }}><span style={{ flex: 1 }}>{k}</span><b>{v.toLocaleString('en-IN')}</b></div>)}
        </div>
      </div>
      {ask && <Confirm title="Make new demo data" confirmLabel="Yes, make new data" text="All current demo data will be replaced. Continue?"
        onClose={() => setAsk(null)} onConfirm={() => { regenerate(ask); toast('New demo data ready'); }} />}
    </>
  );
}
