import { useState } from 'react';
import { Plus, Trash2, Info } from 'lucide-react';
import { useStore, fmtDate } from '../context/StoreContext';
import { PageHead, Badge, Modal, FormFields, Confirm } from '../components/UI';
import { ACCESS, ROLE_ORDER } from '../data/roles';

// admin_users = who can log in to this Admin app and with which role.
// Supabase: create the user in Authentication (email + password) → its user_id goes in admin_users with staff_id + access_role.
export default function Users() {
  const { db, find, canEdit, addRow, updateRow, deleteRow, toast, user } = useStore();
  const editable = canEdit('/users');
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const rows = [...db.admin_users].sort((a, b) => ROLE_ORDER.indexOf(a.access_role) - ROLE_ORDER.indexOf(b.access_role));
  const withLogin = new Set(db.admin_users.map((a) => a.staff_id));

  const save = async (e) => {
    e.preventDefault();
    if (user.role !== 'Director' && form.access_role === 'Director') { toast('Only the Director can give Director access'); return; }
    const ok = await addRow('admin_users', { staff_id: form.staff_id, access_role: form.access_role, email: form.email.trim().toLowerCase(), is_active: true,
      created_at: new Date().toISOString().slice(0, 16).replace('T', ' ') });
    if (ok) { toast(`Login access given to ${find('staff', form.staff_id)?.name}`); setForm(null); }
  };

  return (
    <>
      <PageHead title="Users & Access" sub="Who can log in to the Admin app and what each role can do">
        {editable && <button className="btn btn-primary" onClick={() => setForm({ access_role: 'Supervisor' })}><Plus size={16} /> Give login access</button>}
      </PageHead>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title"><span><Info size={16} style={{ verticalAlign: -3 }} /> How login works</span></div>
        <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>There is <b>no sign-up</b> on the admin side.</li>
          <li>The <b>first Director</b> account is made once in Supabase (Authentication → Add user) and one row is added in <code>admin_users</code>.</li>
          <li>After that the Director / Manager gives access here: pick the staff member, role and email.</li>
          <li>The person logs in with that email → their own name shows and only their role's pages open.</li>
        </ol>
      </div>

      <div className="table-wrap" style={{ marginBottom: 16 }}>
        <table className="table">
          <thead><tr><th>Name</th><th>Staff role</th><th>Login role</th><th>Email</th><th>Given on</th><th>Active</th>{editable && <th />}</tr></thead>
          <tbody>
            {rows.map((a) => {
              const s = find('staff', a.staff_id);
              return (
                <tr key={a.user_id}>
                  <td className="strong">{s?.name || a.staff_id}</td>
                  <td>{s?.role}<div className="muted">{s?.department}</div></td>
                  <td><Badge>{a.access_role}</Badge></td>
                  <td>{a.email}</td>
                  <td>{fmtDate(a.created_at)}</td>
                  <td>
                    {editable ? (
                      <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" checked={a.is_active} onChange={(e) => updateRow('admin_users', a.user_id, { is_active: e.target.checked })} />
                        <Badge>{a.is_active ? 'Active' : 'Inactive'}</Badge>
                      </label>
                    ) : <Badge>{a.is_active ? 'Active' : 'Inactive'}</Badge>}
                  </td>
                  {editable && <td className="row-actions"><button className="icon-btn danger" title="Remove access" onClick={() => setDel(a)}><Trash2 size={15} /></button></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-title">What each role can do</div>
        <div className="table-wrap" style={{ border: 'none' }}>
          <table className="table">
            <thead><tr><th>Role</th><th>Opens on</th><th className="num">Pages it can see</th><th className="num">Pages it can change</th><th>Note</th></tr></thead>
            <tbody>
              {ROLE_ORDER.map((r) => (
                <tr key={r}><td><Badge>{r}</Badge></td><td>{ACCESS[r].home === '/' ? 'Dashboard' : ACCESS[r].home.slice(1)}</td>
                  <td className="num">{ACCESS[r].view.length}</td><td className="num">{ACCESS[r].edit.length}</td><td className="muted">{ACCESS[r].note}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <Modal title="Give login access" onClose={() => setForm(null)}
          footer={<><button className="btn btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" form="userForm">Give access</button></>}>
          <form id="userForm" onSubmit={save}>
            <FormFields values={form} onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))} fields={[
              { key: 'staff_id', label: 'Staff member', type: 'select', required: true, full: true,
                options: db.staff.filter((s) => !withLogin.has(s.staff_id)).map((s) => ({ value: s.staff_id, label: `${s.name} – ${s.role} (${s.department})` })) },
              { key: 'access_role', label: 'Login role', type: 'select', options: ROLE_ORDER, required: true },
              { key: 'email', label: 'Login email', type: 'email', required: true }
            ]} />
            <p className="muted" style={{ marginTop: 12 }}>In Supabase the same email is added in Authentication → Users with a temporary password.</p>
          </form>
        </Modal>
      )}
      {del && <Confirm title="Remove access" confirmLabel="Remove" text={`Remove login access of ${find('staff', del.staff_id)?.name}? The staff record stays.`}
        onClose={() => setDel(null)} onConfirm={async () => { if (await deleteRow('admin_users', del.user_id)) toast('Access removed'); }} />}
    </>
  );
}
