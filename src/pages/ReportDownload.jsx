// Reports → "Download / Print" tab
// Pick a report, a date range (today / week / month / year / custom from–to) and how to show it
// (every entry or day / week / month / year totals), then download PDF, Excel, Word or print.
import { useMemo, useState } from 'react';
import { FileText, FileSpreadsheet, FileType, Printer } from 'lucide-react';
import { useStore, rupee } from '../context/StoreContext';
import { REPORTS, RANGES, GROUPS, rangeOf, buildReport, fmtD } from '../data/statements';
import { downloadPDF, downloadExcel, downloadWord, printReport } from '../lib/reportExport';

const SHED_REPORTS = ['milk', 'feed', 'health'];

export default function ReportDownload() {
  const { db, can, user, toast } = useStore();
  const allowed = REPORTS.filter((r) => r.key === 'milk' || can(r.page));
  const [key, setKey] = useState(allowed[0]?.key);
  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [group, setGroup] = useState('day');
  const [shed, setShed] = useState('All');
  const [busy, setBusy] = useState('');

  const [f, t] = rangeOf(preset, from, to);
  const bad = f > t;
  const rep = useMemo(() => {
    if (bad || !key) return null;
    const r = buildReport(key, db, { from: f, to: t, group, shed: SHED_REPORTS.includes(key) ? shed : 'All' });
    return { ...r, title: `${REPORTS.find((x) => x.key === key).label} report` };
  }, [db, key, f, t, group, shed, bad]);

  const farm = db.farm[0] || {};
  const meta = {
    farm: farm.farm_name || 'Pinjrapole Gaushala', farmLine: `${farm.owner_society || ''} · ${String(farm.farm_location || '').split(' – ')[0]}`,
    period: `${fmtD(f)} to ${fmtD(t)}`, fromIso: f, toIso: t, group: GROUPS.find((g) => g[0] === group)[1],
    shed: SHED_REPORTS.includes(key) && shed !== 'All' ? db.sheds.find((s) => s.shed_id === shed)?.shed_name : '',
    by: `${user.name} (${user.role})`, on: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  };
  const run = async (kind, fn) => {
    setBusy(kind);
    try { const ok = await fn(rep, meta); if (ok === false) toast('Allow pop-ups to print'); else if (kind !== 'Print') toast(`${kind} downloaded`); }
    catch (e) { toast(`Could not make ${kind}: ${e.message}`); }
    setBusy('');
  };
  const show = (v, col) => (v === '' || v === null || v === undefined ? '' : col.money ? rupee(v) : typeof v === 'number' ? v.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : v);

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Make a report – like a bank statement, from one date to another</div>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          <div>
            <label className="label">Report</label>
            <select className="input" value={key} onChange={(e) => setKey(e.target.value)}>
              {allowed.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Period</label>
            <select className="input" value={preset} onChange={(e) => { setPreset(e.target.value); if (e.target.value === 'custom' && !from) { setFrom(f); setTo(t); } }}>
              {RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {preset === 'custom' && <>
            <div><label className="label">From date</label><input className="input" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><label className="label">To date</label><input className="input" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div>
          </>}
          <div>
            <label className="label">Show</label>
            <select className="input" value={group} onChange={(e) => setGroup(e.target.value)}>
              {GROUPS.map(([v, l]) => <option key={v} value={v}>{v === 'detail' ? l : `${l} totals`}</option>)}
            </select>
          </div>
          {SHED_REPORTS.includes(key) && (
            <div>
              <label className="label">Shed</label>
              <select className="input" value={shed} onChange={(e) => setShed(e.target.value)}>
                <option value="All">All sheds</option>
                {db.sheds.map((s) => <option key={s.shed_id} value={s.shed_id}>{s.shed_name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16, alignItems: 'center' }}>
          <button className="btn btn-red" disabled={!rep || !!busy} onClick={() => run('PDF', downloadPDF)}><FileText size={16} /> {busy === 'PDF' ? 'Making…' : 'Download PDF'}</button>
          <button className="btn btn-primary" disabled={!rep || !!busy} onClick={() => run('Excel', downloadExcel)}><FileSpreadsheet size={16} /> {busy === 'Excel' ? 'Making…' : 'Download Excel'}</button>
          <button className="btn btn-blue" disabled={!rep || !!busy} onClick={() => run('Word', downloadWord)}><FileType size={16} /> {busy === 'Word' ? 'Making…' : 'Download Word'}</button>
          <button className="btn btn-outline" disabled={!rep || !!busy} onClick={() => run('Print', printReport)}><Printer size={16} /> Print</button>
          <span className="muted">{bad ? '“From” date must be before “To” date' : `${meta.period} · ${rep?.rows.length || 0} rows`}</span>
        </div>
      </div>

      {rep && (
        <div className="card">
          <div className="card-title"><span>{rep.title}<div className="muted" style={{ fontWeight: 400 }}>{meta.period} · {meta.group}{meta.shed ? ` · ${meta.shed}` : ''}</div></span></div>
          <div className="stats" style={{ marginBottom: 14 }}>
            {rep.summary.map((s) => (
              <div className="stat" key={s[0]} style={{ padding: 12 }}><div><div className="stat-label">{s[0]}</div><div className="stat-value" style={{ fontSize: 18 }}>{s[2] === 'money' ? rupee(s[1]) : s[1]}</div></div></div>
            ))}
          </div>
          <div className="table-wrap" style={{ maxHeight: 460, overflow: 'auto' }}>
            <table className="table">
              <thead><tr>{rep.columns.map((c) => <th key={c.label} className={c.num || c.money ? 'num' : ''}>{c.label}</th>)}</tr></thead>
              <tbody>
                {rep.rows.slice(0, 300).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={rep.columns[j].num || rep.columns[j].money ? 'num' : ''}>{show(v, rep.columns[j])}</td>)}</tr>)}
                {rep.totals && <tr style={{ background: '#E8F2D8', fontWeight: 700 }}>{rep.totals.map((v, j) => <td key={j} className={rep.columns[j].num || rep.columns[j].money ? 'num' : ''}>{show(v, rep.columns[j])}</td>)}</tr>}
              </tbody>
            </table>
            {rep.rows.length === 0 && <div className="empty">No records in this period.</div>}
          </div>
          {rep.rows.length > 300 && <p className="muted" style={{ marginTop: 8 }}>Preview shows the first 300 rows – the downloaded file has all {rep.rows.length.toLocaleString('en-IN')} rows.</p>}
        </div>
      )}
    </>
  );
}
