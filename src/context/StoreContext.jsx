// Keeps all tables in memory so every page can read them quickly.
// Data source:
//   'supabase' → tables are loaded from Supabase, and add / edit / delete are saved in Supabase
//   'demo'     → random dummy data (Settings page), nothing is saved
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { generate, DEFAULT_SETTINGS } from '../data/generate';
import { canView, canEdit } from '../data/roles';
import { supabase } from '../lib/supabase';

const StoreContext = createContext(null);

// primary key of every table (same as Supabase)
export const PK = {
  farm: ['farm_id'], farm_info: ['farm_id', 'info_type', 'title'], staff: ['staff_id'], sheds: ['shed_id'], equipment: ['equipment_name'],
  cows: ['cow_id'], diet_plans: ['plan_name'], items: ['item_id'], contacts: ['contact_id'], purchases_expenses: ['txn_id'],
  daily_diary: ['entry_id'], health_records: ['cow_id', 'check_date'], treatments: ['cow_id', 'check_date', 'item_id'],
  milk_production: ['cow_id', 'milk_date', 'shift'], production_log: ['byproduct_id', 'start_date'], orders: ['order_id'],
  order_items: ['order_id', 'variant_id'], feedback: ['contact_id', 'received_at'], seva_donations_visits: ['entry_id'],
  profiles: ['profile_id'], products: ['product_id'], product_variants: ['variant_id'], cart_items: ['profile_id', 'variant_id'],
  delivery_slots: ['slot_id'], drivers: ['driver_id'], stock_movements: ['variant_id', 'moved_at'], reviews: ['profile_id', 'product_id'],
  cow_movements: ['cow_id', 'movement_date'], admin_users: ['user_id'],
  shed_milk: ['shed_id', 'milk_date', 'shift']
};
const TABLES = Object.keys(PK);
// columns that cannot be empty in Supabase (NOT NULL) – forms mark them with *
export const REQUIRED = {
  farm: ['farm_name', 'owner_society', 'farm_location', 'total_land_bigha'], farm_info: ['details'],
  staff: ['name', 'role', 'skill_type', 'mobile', 'shift', 'monthly_salary', 'remaining_leaves'],
  sheds: ['shed_name', 'shed_type', 'area_sq_ft', 'capacity'], equipment: ['equipment_type', 'status'],
  cows: ['tag_number', 'breed', 'gender', 'cow_type', 'status'], diet_plans: ['for_category'],
  items: ['item_name', 'item_group', 'item_type', 'unit', 'price', 'stock_qty'], contacts: ['name', 'contact_type', 'mobile'],
  purchases_expenses: ['txn_date', 'category', 'amount'], daily_diary: ['entry_date', 'entry_type'], health_records: ['condition'],
  treatments: ['treatment_type', 'dosage', 'start_date', 'status'], milk_production: ['quantity_ltr', 'milking_method'],
  production_log: ['input_material', 'input_qty', 'input_unit'], feedback: ['feedback_type', 'message', 'status'],
  seva_donations_visits: ['entry_type', 'start_date', 'status'], profiles: ['full_name', 'phone', 'created_at'],
  products: ['product_name', 'category'], product_variants: ['size', 'price'], delivery_slots: ['slot_name', 'start_time', 'end_time'],
  stock_movements: ['movement_type', 'quantity'], cow_movements: ['movement_type'], admin_users: ['access_role'],
  shed_milk: ['quantity_ltr']
};
// prefix for new IDs when the table has a single text ID
const NEW_ID = { staff: 'STF-', sheds: 'SHD-', cows: 'COW-', items: 'ITM-', contacts: 'CT-', purchases_expenses: 'TXN-', daily_diary: 'DRY-',
  orders: 'ORD-', seva_donations_visits: 'SDV-', products: 'P-', product_variants: 'V-', delivery_slots: 'SL-' };

export const keyOf = (table, row) => (PK[table] || ['id']).map((k) => row[k]).join('|');

const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const readS = (k, fb) => { try { return JSON.parse(sessionStorage.getItem(k)) ?? fb; } catch { return fb; } };
const writeS = (k, v) => {
  try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
};

// read one whole table from Supabase (Supabase gives max 1000 rows per call, so read in pages)
const OPTIONAL = ['shed_milk'];
async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + 999);
    // tables added later (see pinjrapole SQL) – if not created yet in Supabase, treat as empty instead of failing
    if (error && OPTIONAL.includes(table)) return [];
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
// only the columns that exist in the table (hidden helper fields start with _ )
const forDb = (row) => Object.fromEntries(Object.entries(row).filter(([k, v]) => !k.startsWith('_') && v !== undefined));
const pkMatch = (table, row) => Object.fromEntries(PK[table].map((k) => [k, row[k]]));

export function StoreProvider({ children }) {
  const [settings, setSettingsState] = useState(() => read('esd_settings', DEFAULT_SETTINGS));
  const [source, setSourceState] = useState(() => (supabase ? read('esd_source', 'supabase') : 'demo'));
  const demo = useMemo(() => generate(settings), [settings]);
  const [db, setDb] = useState(() => (source === 'demo' ? demo : null));
  const [loadError, setLoadError] = useState('');
  const [user, setUserState] = useState(() => readS('esd_user2', null));
  const [toastMsg, setToastMsg] = useState('');
  const live = source === 'supabase';

  const toast = (msg) => {
    setToastMsg(msg);
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => setToastMsg(''), 3000);
  };

  // load every table from Supabase
  const reload = async () => {
    setLoadError('');
    try {
      const all = await Promise.all(TABLES.map((t) => fetchAll(t)));
      setDb(Object.fromEntries(TABLES.map((t, i) => [t, all[i]])));
    } catch (e) {
      setLoadError(e.message);
    }
  };
  useEffect(() => { if (live) reload(); }, [live]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSource = (s) => { write('esd_source', s); setSourceState(s); setDb(s === 'demo' ? demo : null); };
  const regenerate = (s) => { const next = { ...DEFAULT_SETTINGS, ...s }; write('esd_settings', next); setSettingsState(next); setDb(generate(next)); };
  const setUser = (u) => { setUserState(u); writeS('esd_user2', u); };
  const logout = () => setUser(null);

  const nextId = (table) => {
    const prefix = NEW_ID[table];
    const col = PK[table][0];
    const nums = db[table].map((r) => parseInt(String(r[col]).replace(/\D/g, ''), 10)).filter((n) => !Number.isNaN(n));
    const n = (nums.length ? Math.max(...nums) : 0) + 1;
    return prefix + String(n).padStart(3, '0');
  };

  // ADD – returns the saved row, or null if it failed
  const addRow = async (table, row) => {
    const r = { ...row };
    if (NEW_ID[table] && !r[PK[table][0]]) r[PK[table][0]] = nextId(table);
    if (db[table].some((x) => keyOf(table, x) === keyOf(table, r))) { toast('A record with the same key already exists'); return null; }
    let saved = r;
    if (live) {
      const { data, error } = await supabase.from(table).insert(forDb(r)).select().single();
      if (error) { toast(`Not saved: ${error.message}`); return null; }
      saved = data;
    }
    setDb((d) => ({ ...d, [table]: [saved, ...d[table]] }));
    return saved;
  };
  // EDIT – key = keyOf(table, row)
  const updateRow = async (table, key, patch) => {
    const old = db[table].find((x) => keyOf(table, x) === key);
    if (!old) return false;
    let saved = { ...old, ...patch };
    if (live) {
      const { data, error } = await supabase.from(table).update(forDb(patch)).match(pkMatch(table, old)).select().single();
      if (error) { toast(`Not saved: ${error.message}`); return false; }
      saved = data;
    }
    setDb((d) => ({ ...d, [table]: d[table].map((x) => (keyOf(table, x) === key ? saved : x)) }));
    return true;
  };
  // DELETE
  const deleteRow = async (table, key) => {
    const old = db[table].find((x) => keyOf(table, x) === key);
    if (!old) return false;
    if (live) {
      const { error } = await supabase.from(table).delete().match(pkMatch(table, old));
      if (error) { toast(`Not deleted: ${error.message}`); return false; }
    }
    setDb((d) => ({ ...d, [table]: d[table].filter((x) => keyOf(table, x) !== key) }));
    return true;
  };

  // delete many rows at once, e.g. deleteWhere('stock_movements', { variant_id: 'V-03' })
  const deleteWhere = async (table, match) => {
    if (live) {
      const { error } = await supabase.from(table).delete().match(match);
      if (error) { toast(`Not deleted: ${error.message}`); return false; }
    }
    setDb((d) => ({ ...d, [table]: d[table].filter((x) => !Object.entries(match).every(([k, v]) => x[k] === v)) }));
    return true;
  };

  // quick lookups
  const maps = useMemo(() => {
    const m = {};
    if (!db) return m;
    ['staff', 'sheds', 'cows', 'items', 'contacts', 'products', 'product_variants', 'profiles', 'orders', 'delivery_slots'].forEach((t) => {
      m[t] = new Map(db[t].map((r) => [r[PK[t][0]], r]));
    });
    return m;
  }, [db]);
  const find = (table, id) => maps[table]?.get(id);
  const NAME = { staff: 'name', sheds: 'shed_name', cows: 'cow_name', items: 'item_name', contacts: 'name', products: 'product_name', profiles: 'full_name', delivery_slots: 'slot_name' };
  const nameOf = (table, id) => { const r = find(table, id); return r ? (r[NAME[table]] || (table === 'cows' ? r.tag_number : '') || id) : '—'; };
  const variantName = (vid) => { const v = find('product_variants', vid); if (!v) return '—'; return `${nameOf('products', v.product_id)} (${v.size})`; };

  // waiting for Supabase
  if (!db) {
    return (
      <div className="login-form-wrap" style={{ minHeight: '100vh' }}>
        <div className="card" style={{ maxWidth: 460, textAlign: 'center', padding: 30 }}>
          {loadError ? (
            <>
              <h2 className="page-title">Could not load data from Supabase</h2>
              <p className="muted" style={{ margin: '10px 0 18px', wordBreak: 'break-word' }}>{loadError}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={reload}>Try again</button>
                <button className="btn btn-outline" onClick={() => setSource('demo')}>Use demo data</button>
              </div>
            </>
          ) : <p className="strong">Loading data from Supabase…</p>}
        </div>
      </div>
    );
  }

  const role = user?.role;
  return (
    <StoreContext.Provider value={{
      db, settings, regenerate, source, setSource, live, reload, demoAccounts: demo.admin_users,
      addRow, updateRow, deleteRow, deleteWhere, find, nameOf, variantName, user, setUser, logout, toast, toastMsg,
      can: (path) => !!role && canView(role, path), canEdit: (path) => !!role && canEdit(role, path)
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);

export const rupee = (n) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
export const fmtDate = (d) => (d ? new Date(String(d).slice(0, 10)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const ageOf = (dob) => {
  if (!dob) return '—';
  const days = (Date.now() - new Date(dob)) / 86400000;
  if (days < 365) return Math.max(0, Math.round(days / 30)) + ' months';
  return (days / 365).toFixed(1) + ' yrs';
};
