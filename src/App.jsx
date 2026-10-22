import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TablePage from './components/TablePage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Cows from './pages/Cows';
import CowProfile from './pages/CowProfile';
import CowStock from './pages/CowStock';
import Milk from './pages/Milk';
import Feed from './pages/Feed';
import Weather from './pages/Weather';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Staff from './pages/Staff';
import Users from './pages/Users';
import FarmInfo from './pages/FarmInfo';
import Settings from './pages/Settings';
import {
  healthTabs, diaryTabs, productionTabs, itemTabs, customerTabs, driverTabs, slotTabs, feedbackTabs,
  sevaTabs, expenseTabs, shedTabs, equipmentTabs, contactTabs
} from './pages/tableConfigs';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />
        {/* Farm */}
        <Route path="/cows" element={<Cows />} />
        <Route path="/cows/:id" element={<CowProfile />} />
        <Route path="/cow-stock" element={<CowStock />} />
        <Route path="/milk" element={<Milk />} />
        <Route path="/health" element={<TablePage key="health" title="Health & Medicine" sub="Vet check-ups, diseases and medicines given" tabs={healthTabs} />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/diary" element={<TablePage key="diary" title="Daily Diary" sub="Feeding and dung removal of every shed – who did it and on time or not" tabs={diaryTabs} />} />
        <Route path="/weather" element={<Weather />} />
        <Route path="/production" element={<TablePage key="prod" title="Ghee & By-products" sub="Production batches – adds to product stock" tabs={productionTabs} />} />
        {/* Store */}
        <Route path="/products" element={<Products />} />
        <Route path="/feed-stock" element={<TablePage key="items" title="Feed & Medicine Stock" sub="Green / dry fodder, daana, mineral mixture and medicines" tabs={itemTabs} />} />
        {/* Sales */}
        <Route path="/orders" element={<Orders />} />
        <Route path="/customers" element={<TablePage key="cust" title="Customers" sub="Customers of the website – name, mobile and email" tabs={customerTabs} />} />
        <Route path="/drivers" element={<TablePage key="drivers" title="Drivers" sub="Delivery drivers and their vehicles" tabs={driverTabs} />} />
        <Route path="/slots" element={<TablePage key="slots" title="Delivery Slots" sub="Morning and evening delivery times" tabs={slotTabs} />} />
        <Route path="/feedback" element={<TablePage key="feedback" title="Feedback & Reviews" sub="Enquiries, feedback and product reviews" tabs={feedbackTabs} />} />
        <Route path="/seva" element={<TablePage key="seva" title="Donations & Visits" sub="Donations, pooja, gau seva, visits and stay bookings" tabs={sevaTabs} />} />
        {/* Administration */}
        <Route path="/expenses" element={<TablePage key="exp" title="Purchases & Expenses" sub="Feed, medicine, salary, electricity and other spending" tabs={expenseTabs} />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/sheds" element={<TablePage key="sheds" title="Sheds" sub="Sheds, capacity, supervisor and doctor" tabs={shedTabs} />} />
        <Route path="/equipment" element={<TablePage key="equip" title="Equipment & Cameras" sub="Machines, cameras and IoT sensors" tabs={equipmentTabs} />} />
        <Route path="/contacts" element={<TablePage key="contacts" title="Contacts" sub="Suppliers, donors, visitors and others" tabs={contactTabs} />} />
        <Route path="/users" element={<Users />} />
        <Route path="/farm" element={<FarmInfo />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<div className="card empty">Page not found.</div>} />
      </Route>
    </Routes>
  );
}