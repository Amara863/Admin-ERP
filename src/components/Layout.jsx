import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Beef, Milk, HeartPulse, Wheat, NotebookPen, Factory, ArrowLeftRight,
  ShoppingCart, Package, Users, MessageSquare, HandHeart, Receipt, Truck, Clock, Boxes,
  UserCog, Warehouse, Cctv, Building2, Bell, Menu, LogOut, Leaf, BarChart3, CloudSun,
  ShieldCheck, Settings as SettingsIcon, Contact
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

// Sidebar menu – one entry per page. Each role only sees the pages allowed in data/roles.js
export const MENU = [
  { title: 'Overview', links: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 }
  ] },
  { title: 'Farm', links: [
    { to: '/cows', label: 'Livestock (Cows)', icon: Beef },
    { to: '/cow-stock', label: 'Cow Stock In / Out', icon: ArrowLeftRight },
    { to: '/milk', label: 'Milk Production', icon: Milk },
    { to: '/health', label: 'Health & Medicine', icon: HeartPulse },
    { to: '/feed', label: 'Feed & TMR', icon: Wheat },
    { to: '/diary', label: 'Daily Diary', icon: NotebookPen },
    { to: '/weather', label: 'Weather', icon: CloudSun },
    { to: '/production', label: 'Ghee & By-products', icon: Factory }
  ] },
  { title: 'Store', links: [
    { to: '/products', label: 'Products & Stock', icon: Package },
    { to: '/feed-stock', label: 'Feed & Medicine Stock', icon: Boxes }
  ] },
  { title: 'Sales', links: [
    { to: '/orders', label: 'Orders', icon: ShoppingCart },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/drivers', label: 'Drivers', icon: Truck },
    { to: '/slots', label: 'Delivery Slots', icon: Clock },
    { to: '/feedback', label: 'Feedback & Reviews', icon: MessageSquare }
  ] },
  { title: 'Seva', links: [
    { to: '/seva', label: 'Donations & Visits', icon: HandHeart }
  ] },
  { title: 'Administration', links: [
    { to: '/expenses', label: 'Purchases & Expenses', icon: Receipt },
    { to: '/staff', label: 'Staff & Hierarchy', icon: UserCog },
    { to: '/sheds', label: 'Sheds', icon: Warehouse },
    { to: '/equipment', label: 'Equipment & Cameras', icon: Cctv },
    { to: '/contacts', label: 'Contacts', icon: Contact },
    { to: '/users', label: 'Users & Access', icon: ShieldCheck },
    { to: '/farm', label: 'Farm Info', icon: Building2 },
    { to: '/settings', label: 'Settings (Demo data)', icon: SettingsIcon }
  ] }
];

export default function Layout() {
  const { user, toastMsg, db, can, canEdit, logout } = useStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!user) return <Navigate to="/login" replace />;

  const newOrders = db.orders.filter((o) => ['Placed', 'Pending'].includes(o.delivery_status)).length;
  const roleLine = user.role === 'Manager' ? `${user.department} Manager` : user.role;

  return (
    <div className="layout">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo"><Leaf size={20} /></div>
          <div>
            <div className="brand-name">E-SDMART</div>
            <div className="brand-sub">Pinjrapole Gaushala</div>
          </div>
        </div>
        <div className="sidebar-user">
          <div className="avatar">{user.name[0]}</div>
          <div style={{ minWidth: 0 }}>
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-role">{roleLine}</div>
          </div>
        </div>
        {MENU.map((group) => ({ ...group, links: group.links.filter((l) => can(l.to)) }))
          .filter((group) => group.links.length > 0)
          .map((group) => (
            <div className="nav-group" key={group.title}>
              <div className="nav-title">{group.title}</div>
              {group.links.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} end={to === '/'} className="nav-link" onClick={() => setOpen(false)}>
                  <Icon size={18} /> {label}
                </NavLink>
              ))}
            </div>
          ))}
      </aside>
      <div className={`overlay ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <div className="topbar-welcome hide-sm">Namaste, <b>{user.name.split(' ')[0]}</b> 🙏</div>
          <div className="topbar-right">
            {can('/orders') && (
              <button className="icon-btn" aria-label="New orders" title={`${newOrders} new orders`} onClick={() => navigate('/orders')}>
                <Bell size={20} />{newOrders > 0 && <span className="dot" />}
              </button>
            )}
            <div className="avatar">{user.name[0]}</div>
            <div className="hide-sm">
              <div className="strong">{user.name}</div>
              <div className="muted">{roleLine}</div>
            </div>
            <button className="icon-btn" aria-label="Logout" title="Logout" onClick={() => { logout(); navigate('/login'); }}><LogOut size={19} /></button>
          </div>
        </header>
        <main className="page">
          {!canEdit(pathname) && can(pathname) && !['/', '/reports'].includes(pathname) && user.role !== 'Worker' && (
            <div className="readonly-note">👁 View only – your role ({user.role}) cannot add or change data on this page.</div>
          )}
          {can(pathname) ? <Outlet /> : (
            <div className="card empty">
              <h2 className="page-title">No access</h2>
              <p className="page-sub" style={{ margin: '8px 0 16px' }}>Your role ({user.role}) cannot open this page.</p>
              <button className="btn btn-primary" onClick={() => navigate(can('/') ? '/' : '/cows')}>Go to my home page</button>
            </div>
          )}
        </main>
      </div>
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}