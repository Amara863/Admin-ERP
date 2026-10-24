import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import {
  ShoppingCart, AlertTriangle, IndianRupee, UserPlus, Beef, Milk, HeartPulse, ClipboardX,
  Plus, PackageCheck, BarChart3, Package, Stethoscope, CheckCircle2
} from 'lucide-react';
import { useStore, rupee, fmtDate } from '../context/StoreContext';
import { PageHead, StatCard, Badge } from '../components/UI';
import { cowsInStock, stockSummary, lowStock, orderTotal, milkByDate, TODAY, daysAgo } from '../data/calc';

const short = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function Dashboard() {
  const { db, user, can, variantName, nameOf } = useStore();
  const navigate = useNavigate();

  const d = useMemo(() => {
    const summary = stockSummary(db);
    const low = lowStock(db, summary);
    const pending = db.orders.filter((o) => ['Placed', 'Pending', 'Packed'].includes(o.delivery_status));
    const todays = db.orders.filter((o) => o.order_date === TODAY && o.delivery_status !== 'Cancelled');
    const salesToday = todays.reduce((s, o) => s + orderTotal(db, o.order_id), 0);
    const newCust = db.profiles.filter((p) => p.created_at.slice(0, 10) >= daysAgo(6));
    const herd = cowsInStock(db).filter((c) => c.shed_id);
    const milk = milkByDate(db);
    const milkToday = milk[TODAY] || 0;
    const milkYday = milk[daysAgo(1)] || 0;
    const sick = herd.filter((c) => c.status === 'Sick');
    const todayTasks = db.daily_diary.filter((x) => x.entry_date === TODAY && x.status);
    const missed = todayTasks.filter((x) => x.status === 'Missed');
    const milkTrend = Array.from({ length: 30 }, (_, i) => { const day = daysAgo(29 - i); return { day: short(day), litres: Math.round(milk[day] || 0) }; });
    const salesTrend = Array.from({ length: 14 }, (_, i) => {
      const day = daysAgo(13 - i);
      return { day: short(day), sales: db.orders.filter((o) => o.order_date === day && o.delivery_status !== 'Cancelled').reduce((s, o) => s + orderTotal(db, o.order_id), 0) };
    });
    return { summary, low, pending, todays, salesToday, newCust, herd, milkToday, milkYday, sick, todayTasks, missed, milkTrend, salesTrend };
  }, [db]);

  // recent activity & alerts – newest first
  const activity = useMemo(() => {
    const a = [];
    d.low.forEach((v) => a.push({ tone: 'red', icon: AlertTriangle, text: `Low stock: ${variantName(v.variant_id)} – only ${d.summary[v.variant_id].current} left (min ${v.reorder_level})`, to: '/products', when: TODAY }));
    db.items.filter((i) => i.stock_qty < i.reorder_level).forEach((i) => a.push({ tone: 'red', icon: AlertTriangle, text: `${i.item_name} below reorder level (${i.stock_qty} ${i.unit})`, to: '/feed-stock', when: TODAY }));
    d.sick.forEach((c) => a.push({ tone: 'amber', icon: HeartPulse, text: `${(c.cow_name || c.tag_number)} (${c.cow_id}) is sick – in ${nameOf('sheds', c.shed_id)}`, to: `/cows/${c.cow_id}`, when: TODAY }));
    d.missed.forEach((x) => a.push({ tone: 'red', icon: ClipboardX, text: `${x.entry_type} missed today in ${nameOf('sheds', x.shed_id)} (${x.remarks})`, to: '/diary', when: TODAY }));
    d.pending.slice(0, 5).forEach((o) => a.push({ tone: 'green', icon: ShoppingCart, text: `New order ${o.order_id} from ${nameOf('profiles', o.profile_id)} – ${rupee(orderTotal(db, o.order_id))}`, to: '/orders', when: o.order_date }));
    db.health_records.filter((h) => h.check_date >= daysAgo(2) && h.condition === 'Sick').forEach((h) => a.push({ tone: 'amber', icon: Stethoscope, text: `Vet check: ${nameOf('cows', h.cow_id)} – ${h.disease_name}`, to: '/health', when: h.check_date }));
    return a.filter((x) => can(x.to)).slice(0, 9);
  }, [d, db, can, nameOf, variantName]);

  const sales = can('/orders');
  return (
    <>
      <PageHead title={`Welcome back, ${user.name.split(' ')[0]}!`} sub={`${fmtDate(TODAY)} · here is what is happening at Pinjrapole Gaushala today`} />

      {sales && (
        <div className="stats">
          <StatCard icon={ShoppingCart} label="Orders Pending" value={d.pending.length} color={{ bg: '#E7F0FA', fg: '#2B6CB0' }}
            action={<Link className="btn-link" to="/orders">View Orders →</Link>} />
          <StatCard icon={AlertTriangle} label="Low Stock" value={d.low.length} note="products below minimum" trend={d.low.length ? 'down' : ''} color={{ bg: '#FDECEA', fg: '#C0392B' }}
            action={<Link className="btn-link" to="/products">View Stock →</Link>} />
          <StatCard icon={IndianRupee} label="Sales Today" value={rupee(d.salesToday)} note={`${d.todays.length} orders today`} color={{ bg: '#E8F2D8', fg: '#388C5B' }} />
          <StatCard icon={UserPlus} label="New Customers" value={d.newCust.length} note="last 7 days" color={{ bg: '#EFEAFB', fg: '#6B46C1' }}
            action={can('/customers') && <Link className="btn-link" to="/customers">View →</Link>} />
        </div>
      )}
      <div className="stats">
        <StatCard icon={Beef} label="Cows in stock" value={d.herd.length} note={`${d.herd.filter((c) => c.cow_type === 'Milking cow').length} milking · ${d.herd.filter((c) => c.status === 'Pregnant').length} pregnant`} />
        <StatCard icon={Milk} label="Milk today" value={`${Math.round(d.milkToday)} L`} note={`${d.milkToday >= d.milkYday ? '▲' : '▼'} ${Math.abs(Math.round(d.milkToday - d.milkYday))} L vs yesterday`} trend={d.milkToday >= d.milkYday ? 'up' : 'down'} />
        <StatCard icon={HeartPulse} label="Sick cows" value={d.sick.length} note="under treatment" trend={d.sick.length ? 'down' : ''} />
        <StatCard icon={ClipboardX} label="Tasks today" value={`${d.todayTasks.filter((x) => x.status === 'Done').length}/${d.todayTasks.length}`} note={`${d.missed.length} missed, ${d.todayTasks.filter((x) => x.status === 'Delayed').length} delayed`} trend={d.missed.length ? 'down' : 'up'} />
      </div>

      <div className="grid-2">
        <div className="card chart-card">
          <div className="card-title">Milk production – last 30 days (litres) {can('/milk') && <Link to="/milk">Details</Link>}</div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={d.milkTrend} margin={{ left: -10, right: 8 }}>
              <defs><linearGradient id="gm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#388C5B" stopOpacity={0.35} /><stop offset="100%" stopColor="#388C5B" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#EEF1EE" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v} L`, 'Milk']} />
              <Area dataKey="litres" stroke="#388C5B" strokeWidth={2} fill="url(#gm)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-title">Quick Actions</div>
          <div className="quick">
            {can('/products') && <button className="btn btn-primary" onClick={() => navigate('/products?add=1')}><Plus size={16} /> Add Product</button>}
            {can('/orders') && <button className="btn btn-blue" onClick={() => navigate('/orders')}><PackageCheck size={16} /> Process Orders</button>}
            {can('/reports') && <button className="btn btn-amber" onClick={() => navigate('/reports')}><BarChart3 size={16} /> View Reports</button>}
            {can('/milk') && <button className="btn btn-outline" onClick={() => navigate('/milk')}><Milk size={16} /> Enter Milk</button>}
            {can('/diary') && <button className="btn btn-outline" onClick={() => navigate('/diary')}><CheckCircle2 size={16} /> Daily Diary</button>}
            {can('/health') && <button className="btn btn-outline" onClick={() => navigate('/health')}><Stethoscope size={16} /> Health Records</button>}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Recent Activity &amp; Alerts</div>
          {activity.length === 0 && <div className="empty">All good – no alerts today.</div>}
          {activity.map((x, i) => (
            <Link to={x.to} key={i} className="list-item">
              <div className={`list-icon ${x.tone}`}><x.icon size={17} /></div>
              <div style={{ flex: 1 }}>{x.text}</div>
              <span className="muted">{x.when === TODAY ? 'Today' : short(x.when)}</span>
            </Link>
          ))}
        </div>
        {sales ? (
          <div className="card">
            <div className="card-title">Sales – last 14 days</div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={d.salesTrend} margin={{ left: -6, right: 4 }}>
                <CartesianGrid stroke="#EEF1EE" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={1} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [rupee(v), 'Sales']} />
                <Bar dataKey="sales" fill="#388C5B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="card">
            <div className="card-title">Sick cows</div>
            {d.sick.length === 0 && <div className="empty">No sick cow.</div>}
            {d.sick.map((c) => (
              <Link to={`/cows/${c.cow_id}`} key={c.cow_id} className="list-item">
                <div className="list-icon amber"><HeartPulse size={17} /></div>
                <div style={{ flex: 1 }}><b>{(c.cow_name || c.tag_number)}</b> <span className="muted">{c.cow_id} · {c.breed}</span></div>
                <Badge>Sick</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {sales && d.low.length > 0 && (
        <div className="card">
          <div className="card-title">Low stock products <Link to="/products">Manage stock</Link></div>
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="table">
              <thead><tr><th>Product</th><th className="num">Live stock</th><th className="num">Min level</th><th /></tr></thead>
              <tbody>
                {d.low.map((v) => (
                  <tr key={v.variant_id}>
                    <td className="strong"><Package size={14} style={{ verticalAlign: -2 }} /> {variantName(v.variant_id)}</td>
                    <td className="num" style={{ color: 'var(--red)', fontWeight: 700 }}>{d.summary[v.variant_id].current}</td>
                    <td className="num">{v.reorder_level}</td>
                    <td><Badge>Low stock</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
