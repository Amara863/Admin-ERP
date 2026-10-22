import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useStore, fmtDate, rupee } from '../context/StoreContext';
import { PageHead, Modal, FormFields } from '../components/UI';
import { DataTable } from '../components/TablePage';
import { cowsInStock } from '../data/calc';

// Table 1A farm (one row) + Table 1B farm_info (about, contact, certificates, trainings…)
const infoConfig = {
  table: 'farm_info', singular: 'Info', addLabel: 'Add info', filterKey: 'info_type', defaults: { farm_id: 'FARM-01', info_type: 'Certificate' },
  columns: [
    { label: 'Type', key: 'info_type' },
    { label: 'Title', render: (r) => <span className="strong">{r.title}</span>, text: (r) => r.title },
    { label: 'Details', key: 'details' },
    { label: 'Date', render: (r) => fmtDate(r.info_date) },
    { label: 'Fee', num: true, render: (r) => (r.amount != null ? rupee(r.amount) : '—') },
    { label: 'Trainer', render: (r, s) => (r.staff_id ? s.nameOf('staff', r.staff_id) : '—') },
    { label: 'Link', render: (r) => r.link || '—' }
  ],
  fields: (s) => [
    { key: 'info_type', label: 'Type', type: 'select', options: ['About farm', 'About group', 'Address', 'Contact', 'Feedback email', 'Bank account', 'Certificate', 'Achievement', 'Training program'], required: true },
    { key: 'title', label: 'Title', required: true },
    { key: 'details', label: 'Details', type: 'textarea', full: true },
    { key: 'info_date', label: 'Date', type: 'date' },
    { key: 'amount', label: 'Fee (₹, training)', type: 'number' },
    { key: 'staff_id', label: 'Trainer', type: 'select', options: s.db.staff.map((x) => ({ value: x.staff_id, label: x.name })) },
    { key: 'link', label: 'Document / photo link', full: true }
  ]
};

export default function FarmInfo() {
  const { db, canEdit, updateRow, toast } = useStore();
  const f = db.farm[0];
  const [form, setForm] = useState(null);
  const inStock = cowsInStock(db).filter((c) => c.shed_id).length;
  return (
    <>
      <PageHead title="Farm Info" sub="Farm details (Table 1A) and website information (Table 1B)">
        {canEdit('/farm') && <button className="btn btn-primary" onClick={() => setForm({ ...f })}><Pencil size={15} /> Edit farm</button>}
      </PageHead>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">{f.farm_name} <span className="muted">{f.farm_id}</span></div>
        <dl className="kv">
          <dt>Owner / society</dt><dd>{f.owner_society}</dd>
          <dt>Location</dt><dd>{f.farm_location}</dd>
          <dt>Total land</dt><dd>{f.total_land_acre} acre</dd>
          <dt>Cows in stock</dt><dd>{inStock} <span className="muted">(updated automatically from Cow Stock)</span></dd>
        </dl>
      </div>
      <DataTable config={infoConfig} />
      {form && (
        <Modal title="Edit farm" onClose={() => setForm(null)}
          footer={<><button className="btn btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" form="farmForm">Save</button></>}>
          <form id="farmForm" onSubmit={async (e) => { e.preventDefault(); const { no_of_cows_in_stock, ...rest } = form; if (await updateRow('farm', f.farm_id, { ...rest, total_land_acre: Number(form.total_land_acre) })) { setForm(null); toast('Farm updated'); } }}>
            <FormFields values={form} onChange={(k, v) => setForm((x) => ({ ...x, [k]: v }))} fields={[
              { key: 'farm_name', label: 'Farm name', required: true }, { key: 'owner_society', label: 'Owner / society' },
              { key: 'farm_location', label: 'Location (Google Maps link)', full: true }, { key: 'total_land_acre', label: 'Total land (acre)', type: 'number' }]} />
          </form>
        </Modal>
      )}
    </>
  );
}
