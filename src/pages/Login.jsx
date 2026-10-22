import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Info } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ACCESS, ROLE_ORDER } from '../data/roles';

// LOGIN FLOW (no public sign-up on the admin side):
// 1. The first Director account is made once in Supabase (Authentication → Add user) + one row in admin_users.
// 2. After that the Director / Manager gives login access to staff from "Users & Access".
// 3. The person logs in with that email → their name and role come from staff + admin_users → their own pages open.
// Demo: any password works. Later: supabase.auth.signInWithPassword({ email, password }).
export default function Login() {
  const { db, setUser, find, demoAccounts } = useStore();
  // until real logins are added in Supabase (admin_users empty), the demo accounts are used
  const logins = db.admin_users.length ? db.admin_users : demoAccounts;
  const navigate = useNavigate();
  const [role, setRole] = useState('Manager');
  const [email, setEmail] = useState(() => logins.find((a) => a.access_role === 'Manager')?.email || '');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');

  // all accounts that have login access, joined with the staff table
  const accounts = logins.filter((a) => a.is_active).map((a) => ({ ...a, staff: find('staff', a.staff_id) })).filter((a) => a.staff);
  const ofRole = accounts.filter((a) => a.access_role === role);

  const pickRole = (r) => { setRole(r); setEmail(accounts.find((a) => a.access_role === r)?.email || ''); setError(''); };

  const submit = (e) => {
    e.preventDefault();
    const a = accounts.find((x) => x.email === email.trim().toLowerCase());
    if (!a) { setError('This email has no login access. Ask the Director / Manager to give access.'); return; }
    setUser({ name: a.staff.name, role: a.access_role, staff_id: a.staff_id, email: a.email, department: a.staff.department, shed_id: a.staff.shed_id });
    navigate(ACCESS[a.access_role].home);
  };

  return (
    <div className="login-page">
      <div className="login-art">
        <img src="./images/gaushala-herd.jpg" alt="Cows at Pinjrapole Gaushala, Jaipur" className="login-photo" />
        <div className="login-shade" />
        <div className="login-top">
          <div className="brand-logo"><Leaf size={20} /></div>
          <div>
            <div className="brand-name">Pinjrapole Gaushala</div>
            <div className="brand-sub">Jaipur, Rajasthan</div>
          </div>
        </div>
        <div className="login-bottom">
          <p className="login-shloka">गौः करुणा, सेवा च धर्मस्य मूलम्।</p>
          <h1>Pinjrapole Gaushala Management System</h1>
          <p className="login-lead hindi">गाय करुणा और सेवा के माध्यम से धर्म का मूल है। 30 वर्षों से अधिक समय से गौमाताओं की सेवा में समर्पित।</p>
          <div className="login-stats">
            <div><b>3000+</b><span>गौमाताएं</span></div>
            <div><b>100+</b><span>वर्षों की सेवा</span></div>
            <div><b>∞</b><span>पुण्य का फल</span></div>
          </div>
        </div>
      </div>

      <div className="login-form-wrap">
        <form className="card login-card" onSubmit={submit} style={{ padding: 30 }}>
          <h2 className="page-title">Staff login</h2>
          <p className="page-sub" style={{ marginBottom: 18 }}>Choose your role and sign in</p>

          <div className="role-tabs">
            {ROLE_ORDER.map((r) => (
              <button type="button" key={r} className={`role-tab ${role === r ? 'active' : ''}`} onClick={() => pickRole(r)}>{r}</button>
            ))}
          </div>
          <p className="muted" style={{ margin: '8px 0 16px' }}>{ACCESS[role].note}</p>

          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} style={{ marginBottom: 14 }} />
          <label className="label">Password</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: 14 }} />
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>Login as {role}</button>

          <div className="login-help">
            <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>No sign-up here. The Director / Manager gives login access from <b>Users &amp; Access</b>.</span>
          </div>

          <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <p className="label">{role} accounts (demo – any password)</p>
            <div style={{ maxHeight: 190, overflowY: 'auto' }}>
              {ofRole.map((a) => (
                <button type="button" key={a.user_id} className={`demo-acc ${email === a.email ? 'sel' : ''}`} onClick={() => { setEmail(a.email); setError(''); }}>
                  <span><b>{a.staff.name}</b> – {a.access_role === 'Manager' ? `${a.staff.department} Manager` : a.staff.role}</span>
                  <span className="muted">{a.email}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
