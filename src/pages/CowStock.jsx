import { useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight, Beef, Baby } from 'lucide-react';
import { useStore, rupee } from '../context/StoreContext';
import { StatCard, Badge } from '../components/UI';
import TablePage from '../components/TablePage';
import { cowMoveTabs } from './tableConfigs';
import { cowsInStock } from '../data/calc';

// Cow stock = cows that came in (purchased / donated / rescued / born) minus cows that went out (sold / given away / died)
export default function CowStock() {
  const { db } = useStore();
  const s = useMemo(() => {
    const count = (t) => db.cow_movements.filter((m) => m.movement_type === t);
    const born = db.cows.filter((c) => c.mother_id).length;
    const stock = cowsInStock(db).filter((c) => c.shed_id);
    const byType = ['Milking cow', 'Dry cow', 'Heifer', 'Calf', 'Bull'].map((t) => [t, stock.filter((c) => c.cow_type === t).length]);
    return { stock, born, byType, inn: ['Purchased', 'Donated in', 'Rescued'].map((t) => [t, count(t).length]),
      out: ['Sold', 'Given away', 'Died'].map((t) => [t, count(t).length, count(t).reduce((a, m) => a + (m.amount || 0), 0)]) };
  }, [db]);
  const totalIn = s.inn.reduce((a, x) => a + x[1], 0) + s.born;
  const totalOut = s.out.reduce((a, x) => a + x[1], 0);
  return (
    <TablePage title="Cow Stock In / Out" sub="How many cows came in, how many were sold / given away / died, and when" tabs={cowMoveTabs}>
      <div className="stats">
        <StatCard icon={Beef} label="Total cows in stock" value={s.stock.length} note={s.byType.map(([t, n]) => `${n} ${t.toLowerCase()}`).join(' · ')} />
        <StatCard icon={ArrowDownLeft} label="Came in (all time)" value={totalIn} note={[...s.inn.map(([t, n]) => `${n} ${t.toLowerCase()}`), `${s.born} born`].join(' · ')} trend="up" />
        <StatCard icon={ArrowUpRight} label="Went out (all time)" value={totalOut} note={s.out.map(([t, n]) => `${n} ${t.toLowerCase()}`).join(' · ')} trend="down" />
        <StatCard icon={Baby} label="Money from cows sold" value={rupee(s.out[0][2])} note={`${s.out[0][1]} sold`} />
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Cows in stock by type</div>
        <div className="chips">{s.byType.map(([t, n]) => <span key={t} style={{ marginRight: 10 }}><Badge>{t}</Badge> <b>{n}</b></span>)}</div>
      </div>
    </TablePage>
  );
}
