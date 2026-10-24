// ---------------------------------------------------------------------------
// Dummy dataset generator. Column names are the SAME as the Supabase tables,
// so later each table can be read from Supabase instead of from here.
// The farm can change the numbers on the Settings page (no. of cows, workers…)
// ---------------------------------------------------------------------------
import { FEED_STANDARDS, BREED_EXPECTED_MILK } from './standards';

export const DEFAULT_SETTINGS = { cows: 60, workersPerSupervisor: 3, customers: 30, days: 120, seed: 7 };

// small seeded random generator, so the same settings always give the same data
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n, w = 3) => String(n).padStart(w, '0');
export const iso = (d) => {
  const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
};
export const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
export const TODAY = daysAgo(0);
const addDays = (s, n) => { const d = new Date(s); d.setDate(d.getDate() + n); return iso(d); };

const FIRST = ['Ramesh', 'Suresh', 'Mahesh', 'Kailash', 'Mohan', 'Sohan', 'Raju', 'Vinod', 'Anil', 'Sunil', 'Gopal', 'Hari', 'Shyam', 'Ravi', 'Mukesh',
  'Dinesh', 'Prakash', 'Om', 'Bhanwar', 'Jagdish', 'Pooja', 'Geeta', 'Sita', 'Kamla', 'Meena', 'Sunita', 'Rekha', 'Lalita', 'Manoj', 'Deepak', 'Naresh', 'Kishan'];
const LAST = ['Sharma', 'Meena', 'Gupta', 'Yadav', 'Singh', 'Jat', 'Saini', 'Kumawat', 'Agarwal', 'Choudhary', 'Verma', 'Joshi', 'Rathore', 'Gurjar'];
const COW_NAMES = ['Gauri', 'Kamdhenu', 'Nandini', 'Lakshmi', 'Ganga', 'Shyama', 'Radha', 'Kapila', 'Surbhi', 'Bhoori', 'Kaveri', 'Yamuna', 'Saraswati',
  'Parvati', 'Tulsi', 'Chandni', 'Basanti', 'Rani', 'Sundari', 'Malti', 'Champa', 'Chameli', 'Godavari', 'Narmada', 'Sita', 'Meera', 'Kalyani', 'Gomti',
  'Sharda', 'Mohini', 'Laxmi', 'Durga', 'Kajal', 'Heera', 'Moti', 'Pinki', 'Sonu', 'Gudiya', 'Rupa', 'Kamla', 'Dhanno', 'Bindiya', 'Komal', 'Roshni'];
const BULL_NAMES = ['Nandi', 'Shankar', 'Bhola', 'Veer', 'Sultan', 'Bahadur'];

export function generate(settings = DEFAULT_SETTINGS) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const r = rng(s.seed);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const between = (a, b) => a + r() * (b - a);
  const int = (a, b) => Math.floor(between(a, b + 1));
  const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
  const person = () => `${pick(FIRST)} ${pick(LAST)}`;
  const phone = () => `98${int(10000000, 99999999)}`;
  const DAYS = s.days;

  // ---------------- 1A farm, 1B farm_info ----------------
  const farm = [{ farm_id: 'FARM-01', farm_name: 'Pinjrapole Gaushala', owner_society: 'Pinjrapole Gaushala Trust (registered society)',
    farm_location: 'Jaipur, Rajasthan – maps.google.com/?q=Pinjrapole+Gaushala+Jaipur', total_land_bigha: 241, no_of_cows_in_stock: 0 }];
  const farm_info = [
    ['About farm', 'About the farm', 'Shelter, food and medical care for old, sick and abandoned cows for more than 100 years.'],
    ['About group', 'About the trust', 'Run by Pinjrapole Gaushala Trust, a registered charitable society. Also runs Pakshi Ghar (bird house) and organic farming.'],
    ['Address', 'Farm address', 'Pinjrapole Gaushala, Jaipur, Rajasthan'],
    ['Contact', 'Contact details', 'Phone +91-9829064734, pinjrapolegaushala@gmail.com, Visiting hours 6:00 AM – 8:00 PM'],
    ['Feedback email', 'Feedback', 'pinjrapolegaushala@gmail.com'],
    ['Bank account', 'Online payment', 'Bank: XXXX, A/c XXXX, IFSC XXXX, UPI XXXX (to be filled by the trust)'],
    ['Certificate', 'Animal Welfare Board registration', 'Registered with Animal Welfare Board of India', '2005-01-01', null, null, '/docs/awbi.pdf'],
    ['Achievement', 'Best Gaushala Award (District)', 'Awarded by District Administration', '2017-01-26', null, null, '/docs/award.pdf'],
    ['Training program', 'Organic Farming with Vermicompost', '3 days, for farmers, 40 seats', addDays(TODAY, 15), 0, 'STF-004', null]
  ].map(([info_type, title, details, info_date = null, amount = null, staff_id = null, link = null]) =>
    ({ farm_id: 'FARM-01', info_type, title, details, info_date, amount, staff_id, link }));

  // ---------------- 3 sheds (supervisors filled after staff) ----------------
  const sheds = [
    { shed_id: 'SHD-01', shed_name: 'Milking Shed A', shed_type: 'Milking', area_sq_ft: 6000, capacity: 40 },
    { shed_id: 'SHD-02', shed_name: 'Milking Shed B', shed_type: 'Milking', area_sq_ft: 5000, capacity: 35 },
    { shed_id: 'SHD-03', shed_name: 'Dry, Pregnant & Bull Shed', shed_type: 'Dry', area_sq_ft: 5000, capacity: 40 },
    { shed_id: 'SHD-04', shed_name: 'Calf & Heifer Shed', shed_type: 'Calf & Heifer', area_sq_ft: 3500, capacity: 40 },
    { shed_id: 'SHD-05', shed_name: 'Hospital Shed', shed_type: 'Hospital', area_sq_ft: 2000, capacity: 15 },
    { shed_id: 'SHD-06', shed_name: 'Store & By-product Unit', shed_type: 'Store', area_sq_ft: 4000, capacity: 0 }
  ].map((x) => ({ ...x, doctor_id: null, supervisor_id: null }));

  // ---------------- 2 staff (hierarchy) ----------------
  const staff = [];
  let sn = 1;
  const addStaff = (o) => {
    const id = `STF-${pad(sn++)}`;
    const skilled = !['Milker', 'Cleaner', 'Feeder', 'Field worker', 'Biogas operator', 'Store helper', 'Driver'].includes(o.role);
    const salary = { Director: 90000, Manager: int(45, 60) * 1000, Supervisor: int(25, 32) * 1000, 'Vet Doctor': 60000, 'Vet Assistant': 25000,
      Accountant: 22000, Priest: 18000 }[o.role] || int(11, 15) * 1000;
    const row = { staff_id: id, name: o.name || person(), dob: `${int(1965, 2000)}-${pad(int(1, 12), 2)}-${pad(int(1, 28), 2)}`,
      role: o.role, department: o.department, reports_to: o.reports_to || null, skill_type: skilled ? 'Skilled' : 'Unskilled',
      mobile: phone(), qualification: o.qualification || (skilled ? pick(['Graduate', 'Diploma Dairy', 'B.Sc Agriculture']) : '—'),
      hygiene_trained: o.role === 'Director' ? false : r() < 0.85, training_date: daysAgo(int(30, 300)), shed_id: o.shed_id || null,
      shift: o.shift || pick(['Morning', 'Evening', 'General']), joined_on: `${int(2008, 2025)}-${pad(int(1, 12), 2)}-01`,
      monthly_salary: salary, last_increment_date: `${pick([2025, 2026])}-04-01`, overtime_hours: skilled ? int(0, 6) : int(0, 20),
      annual_leaves: 24, remaining_leaves: int(4, 24), _rel: o.rel ?? between(0.7, 0.98) };
    staff.push(row);
    return row;
  };
  const director = addStaff({ role: 'Director', department: 'Management', name: 'Mahendra Gupta', qualification: 'MBA', shift: 'General' });
  const vet = addStaff({ role: 'Vet Doctor', department: 'Veterinary', reports_to: director.staff_id, name: 'Dr. Rajesh Sharma', qualification: 'B.V.Sc & AH', shift: 'General' });
  const vetAsst = addStaff({ role: 'Vet Assistant', department: 'Veterinary', reports_to: vet.staff_id, qualification: 'Diploma Vet', shift: 'General' });
  const DEPTS = [
    { department: 'Health', sup: [{ sheds: ['SHD-05'] }], workerRoles: ['Cleaner', 'Feeder'] },
    { department: 'Production', sup: [{ sheds: ['SHD-01'], rel: 0.95 }, { sheds: ['SHD-02'], rel: 0.72 }], workerRoles: ['Milker', 'Feeder', 'Cleaner'] },
    { department: 'Cultivation & By-products', sup: [{ sheds: ['SHD-06'] }, { sheds: ['SHD-03', 'SHD-04'] }], workerRoles: ['Field worker', 'Biogas operator', 'Feeder', 'Cleaner'] },
    { department: 'Purchase', sup: [{ sheds: [] }], workerRoles: ['Store helper'] },
    { department: 'Finance', sup: [{ sheds: [] }], workerRoles: ['Accountant'] }
  ];
  const managers = [];
  DEPTS.forEach((d) => {
    const m = addStaff({ role: 'Manager', department: d.department, reports_to: director.staff_id, qualification: pick(['MBA', 'B.Sc Agriculture', 'M.Com']), shift: 'General' });
    managers.push(m);
    d.sup.forEach((sp) => {
      const sup = addStaff({ role: 'Supervisor', department: d.department, reports_to: m.staff_id, shed_id: sp.sheds[0] || null, shift: 'Morning' });
      sp.sheds.forEach((sid) => { const sh = sheds.find((x) => x.shed_id === sid); sh.supervisor_id = sup.staff_id; });
      for (let i = 0; i < s.workersPerSupervisor; i++) {
        const shedId = sp.sheds.length ? sp.sheds[i % sp.sheds.length] : null;
        // shed workers: their supervisor comes from the shed (reports_to left empty, no repeated data)
        addStaff({ role: d.workerRoles[i % d.workerRoles.length], department: d.department, shed_id: shedId,
          reports_to: shedId ? null : sup.staff_id, rel: (sp.rel ?? 0.88) + between(-0.12, 0.08) });
      }
    });
  });
  const prodManager = managers[1];
  const drivers = [];
  for (let i = 0; i < 2; i++) {
    const d = addStaff({ role: 'Driver', department: 'Production', reports_to: prodManager.staff_id, shift: 'Morning' });
    drivers.push({ driver_id: d.staff_id, user_id: null, vehicle_number: `RJ14-${pick(['AB', 'CD', 'GS'])}-${int(1000, 9999)}`,
      licence_number: `RJ14-20${int(10, 23)}-${pad(int(1, 999999), 6)}`, delivery_area: i ? 'Malviya Nagar, Mansarovar, Sanganer' : 'C-Scheme, Vaishali Nagar, Raja Park', is_available: true });
  }
  addStaff({ role: 'Priest', department: 'Seva', reports_to: director.staff_id, name: 'Pt. Shyam Sharma', shift: 'Morning' });
  sheds.forEach((sh) => { if (sh.shed_type !== 'Store') sh.doctor_id = vet.staff_id; });
  const purchaseMgr = managers[3], financeMgr = managers[4], cultivationMgr = managers[2];
  const workersOf = (shedId) => staff.filter((x) => x.shed_id === shedId && !['Supervisor', 'Manager'].includes(x.role));

  // ---------------- 4 equipment ----------------
  const equipment = [
    ['Milking Machine 1', 'Milking', 'SHD-01', 60000], ['Milking Machine 2', 'Milking', 'SHD-01', 60000], ['Bulk Milk Cooler (500 L)', 'Milking', 'SHD-01', 150000],
    ['Chaff Cutter', 'Fodder cutting', 'SHD-06', 45000], ['Tractor with Trolley', 'Transport', 'SHD-06', 650000], ['Bilona Churning Machine', 'Processing', 'SHD-06', 35000],
    ['Biogas Plant (25 m³)', 'Energy', 'SHD-06', 300000], ['Water Pump & Trough A', 'Watering', 'SHD-01', 25000], ['Water Pump & Trough B', 'Watering', 'SHD-02', 25000],
    ['IP Camera 1 (Milking Shed A)', 'Camera', 'SHD-01', 4500], ['IP Camera 2 (Calf Shed)', 'Camera', 'SHD-04', 4500]
  ].map(([equipment_name, equipment_type, shed_id, purchase_cost], i) => ({
    equipment_name, equipment_type, shed_id, supplier_id: 'CT-003', purchase_date: `${int(2018, 2025)}-${pad(int(1, 12), 2)}-10`, purchase_cost,
    status: i === 3 ? 'Under repair' : 'Working', last_service_date: daysAgo(int(5, 150)),
    stream_url: equipment_type === 'Camera' ? `rtsp://cam${i}/stream` : null, is_public: equipment_type === 'Camera' ? i === 9 : null }));

  // ---------------- 6 diet_plans ----------------
  const diet_plans = FEED_STANDARDS.map(({ water_l, note, ...p }) => ({ ...p }));

  // ---------------- 5 cows ----------------
  const BREEDS = ['Gir', 'Gir', 'Sahiwal', 'Tharparkar', 'Rathi', 'Kankrej', 'Desi'];
  const cows = [];
  let cn = 101;
  const nCows = Math.max(10, s.cows);
  const nBulls = Math.max(1, Math.round(nCows * 0.05));
  for (let i = 0; i < nBulls; i++) {
    cows.push({ cow_id: `COW-${cn++}`, tag_number: `TAG-${pad(cn, 4)}`, cow_name: BULL_NAMES[i % BULL_NAMES.length], breed: pick(BREEDS), gender: 'Male',
      cow_type: 'Bull', dob: `${int(2014, 2019)}-${pad(int(1, 12), 2)}-${pad(int(1, 28), 2)}`, insemination_date: null, birth_type: null,
      mother_id: null, father_id: null, shed_id: 'SHD-03', plan_name: 'Bull', status: 'Healthy', _yield: 0 });
  }
  const bulls = cows.map((c) => c.cow_id);
  const nAdult = Math.round(nCows * 0.62);
  for (let i = 0; i < nAdult; i++) {
    const milking = i < nAdult * 0.8;
    const breed = pick(BREEDS);
    cows.push({ cow_id: `COW-${cn++}`, tag_number: `TAG-${pad(cn, 4)}`, cow_name: COW_NAMES[i % COW_NAMES.length] + (i >= COW_NAMES.length ? ` ${Math.floor(i / COW_NAMES.length) + 1}` : ''),
      breed, gender: 'Female', cow_type: milking ? 'Milking cow' : 'Dry cow', dob: `${int(2012, 2021)}-${pad(int(1, 12), 2)}-${pad(int(1, 28), 2)}`,
      insemination_date: null, birth_type: null, mother_id: null, father_id: null,
      shed_id: milking ? (i % 2 ? 'SHD-02' : 'SHD-01') : 'SHD-03', plan_name: milking ? 'Milking cow' : 'Dry cow', status: 'Healthy',
      _yield: (BREED_EXPECTED_MILK[breed] || 6) * between(0.75, 1.25) });
  }
  const adults = cows.filter((c) => c.gender === 'Female');
  // pregnant cows
  adults.forEach((c) => {
    if (r() < 0.3) { c.status = 'Pregnant'; c.insemination_date = daysAgo(int(60, 250)); if (c.cow_type === 'Dry cow') c.plan_name = 'Pregnant cow'; }
  });
  // calves and heifers born at the farm (children of adults)
  const nYoung = nCows - cows.length;
  for (let i = 0; i < nYoung; i++) {
    const mother = pick(adults);
    const ageDays = int(20, 900);
    const heifer = ageDays > 365;
    const female = heifer || r() < 0.55;
    cows.push({ cow_id: `COW-${cn++}`, tag_number: `TAG-${pad(cn, 4)}`, cow_name: female ? pick(COW_NAMES) + ' (bachhdi)' : pick(['Chhotu', 'Bholu', 'Golu', 'Kanha', 'Shyamu']),
      breed: mother.breed, gender: female ? 'Female' : 'Male', cow_type: heifer ? 'Heifer' : 'Calf', dob: daysAgo(ageDays), insemination_date: null,
      birth_type: r() < 0.85 ? 'Normal' : 'Assisted', mother_id: mother.cow_id, father_id: pick(bulls), shed_id: 'SHD-04',
      plan_name: heifer ? 'Heifer' : 'Calf', status: 'Healthy', _yield: 0 });
  }
  // older calves that were sold / given away (history: lactations of mothers)
  const cow_movements = [];
  const outCalves = Math.round(nCows * 0.15);
  for (let i = 0; i < outCalves; i++) {
    const mother = pick(adults);
    const dob = daysAgo(int(400, 1600));
    const c = { cow_id: `COW-${cn++}`, tag_number: `TAG-${pad(cn, 4)}`, cow_name: pick(['Chhotu', 'Bholu', 'Golu', 'Kanha', 'Shyamu', 'Moti']), breed: mother.breed,
      gender: 'Male', cow_type: 'Calf', dob, insemination_date: null, birth_type: 'Normal', mother_id: mother.cow_id, father_id: pick(bulls),
      shed_id: null, plan_name: null, status: 'Healthy', _yield: 0 };
    cows.push(c);
    const sold = r() < 0.5;
    cow_movements.push({ cow_id: c.cow_id, movement_date: addDays(dob, int(200, 380)), movement_type: sold ? 'Sold' : 'Given away',
      contact_id: sold ? 'CT-010' : 'CT-011', amount: sold ? int(8, 20) * 1000 : 0, remarks: sold ? 'Male calf sold to farmer' : 'Given to another gaushala', entered_by: prodManager.staff_id });
  }
  // how adults came in
  adults.forEach((c) => {
    const t = r();
    const type = t < 0.45 ? 'Purchased' : t < 0.75 ? 'Donated in' : 'Rescued';
    cow_movements.push({ cow_id: c.cow_id, movement_date: addDays(c.dob, int(700, 1400)) > TODAY ? daysAgo(int(200, 900)) : addDays(c.dob, int(700, 1400)),
      movement_type: type, contact_id: type === 'Purchased' ? 'CT-009' : type === 'Donated in' ? 'CT-005' : null,
      amount: type === 'Purchased' ? int(40, 80) * 1000 : 0, remarks: type === 'Rescued' ? 'Rescued from road accident' : '—', entered_by: prodManager.staff_id });
  });
  bulls.forEach((id) => cow_movements.push({ cow_id: id, movement_date: daysAgo(int(900, 2000)), movement_type: 'Donated in', contact_id: 'CT-005', amount: 0, remarks: 'Breeding bull', entered_by: prodManager.staff_id }));
  // a few recent outs
  const died = pick(adults.filter((c) => c.cow_type === 'Dry cow')) || adults[0];
  cow_movements.push({ cow_id: died.cow_id, movement_date: daysAgo(int(10, 60)), movement_type: 'Died', contact_id: null, amount: 0, remarks: 'Old age', entered_by: prodManager.staff_id });
  died.shed_id = null;
  // sick cows go to hospital shed
  const sickCows = adults.filter((c) => c.cow_type === 'Milking cow' && c.status !== 'Pregnant').slice(0, 3);
  sickCows.forEach((c, i) => { c.status = 'Sick'; c._sickShed = c.shed_id; if (i < 2) c.shed_id = 'SHD-05'; c.plan_name = 'Sick cow'; });

  // ---------------- 7 items (feed + medicine) ----------------
  const items = [
    ['FD-01', 'Green Fodder (Napier / Barseem)', 'Feed', 'Green', 'Kg', 3, 15000, 5000],
    ['FD-02', 'Dry Fodder (Wheat Bhoosa)', 'Feed', 'Dry', 'Kg', 8, 6000, 4000],
    ['FD-03', 'Concentrate (Daana)', 'Feed', 'Concentrate', 'Kg', 30, 2500, 800],
    ['FD-04', 'Mineral Mixture', 'Feed', 'Supplement', 'Kg', 90, 60, 25],
    ['MED-01', 'Intramammary Infusion (Mastitis)', 'Medicine', 'Antibiotic', 'Tube', 120, 30, 10],
    ['MED-02', 'FMD + HS Vaccine', 'Medicine', 'Vaccine', 'Dose', 90, 80, 20],
    ['MED-03', 'Meloxicam Injection', 'Medicine', 'Painkiller', 'Vial', 60, 25, 8],
    ['MED-04', 'Anti-bloat Oil', 'Medicine', 'Digestive', 'Bottle', 150, 4, 5],
    ['MED-05', 'Dewormer (Albendazole)', 'Medicine', 'Dewormer', 'Dose', 40, 70, 20],
    ['MED-06', 'Tick Spray', 'Medicine', 'External', 'Bottle', 220, 6, 3]
  ].map(([item_id, item_name, item_group, item_type, unit, price, stock_qty, reorder_level]) => ({
    item_id, item_name, item_group, item_type, unit, price, depreciation_pct: 10, stock_qty, reorder_level,
    expiry_date: item_group === 'Medicine' ? addDays(TODAY, int(60, 500)) : null }));
  const priceOf = Object.fromEntries(items.map((i) => [i.item_id, i.price]));

  // ---------------- 8 contacts ----------------
  const contacts = [
    ['CT-001', 'Shyam Fodder Traders', 'Supplier', 'Mandi Road, Jaipur', '08ABCDE1234F1Z5'],
    ['CT-002', 'Krishna Veterinary Medicals', 'Supplier', 'Station Road, Jaipur', '08ABCDE5678F1Z5'],
    ['CT-003', 'Kisan Agro Equipments', 'Supplier', 'VKI Area, Jaipur', '08ABCDE9012F1Z5'],
    ['CT-004', 'Jaipur Vidyut Vitran Nigam', 'Supplier', 'Jaipur', null],
    ['CT-005', 'Meera Agarwal', 'Donor', 'C-Scheme, Jaipur', null],
    ['CT-006', 'Sunita Jain', 'Donor', 'Vaishali Nagar, Jaipur', null],
    ['CT-007', "St. Mary's School", 'Visitor', 'School Road, Jaipur', null],
    ['CT-008', 'Ravi Joshi', 'Visitor', 'Delhi', null],
    ['CT-009', 'Ram Singh (cattle trader)', 'Supplier', 'Pashu Mela Road', null],
    ['CT-010', 'Mohan Farmer', 'Other', 'Village Bagru', null],
    ['CT-011', 'Shri Krishna Gaushala', 'Other', 'Chomu', null],
    ['CT-012', 'Amit Kumar', 'Other', 'Jaipur', null]
  ].map(([contact_id, name, contact_type, address, gst_number]) => ({ contact_id, name, contact_type, mobile: phone(), email: null, address, gst_number, joined_on: daysAgo(int(30, 1500)) }));

  // ---------------- 13 milk_production, 10 daily_diary ----------------
  const milk_production = [];
  const daily_diary = [];
  let dn = 1;
  const inStock = (c) => c.shed_id && c.cow_type !== null;
  const shedFactor = { 'SHD-01': 1.0, 'SHD-02': 0.86, 'SHD-05': 0.55 };
  const feedFactor = { 'SHD-02': 0.85 };          // Shed B gets less green fodder than standard → lower milk
  const planBy = Object.fromEntries(diet_plans.map((p) => [p.plan_name, p]));
  for (let d = DAYS - 1; d >= 0; d--) {
    const date = daysAgo(d);
    const season = 1 + 0.08 * Math.sin((d / 30) * Math.PI);
    // milk
    cows.filter((c) => c.cow_type === 'Milking cow' && inStock(c)).forEach((c) => {
      const sick = c.status === 'Sick' ? 0.55 : 1;
      const base = c._yield * (shedFactor[c.shed_id] || 1) * season * sick;
      ['Morning', 'Evening'].forEach((shift, k) => {
        const machine = c.shed_id === 'SHD-01';
        milk_production.push({ cow_id: c.cow_id, milk_date: date, shift,
          quantity_ltr: round(Math.max(0.5, base * (k ? 0.45 : 0.55) * between(0.9, 1.1))),
          fat_pct: round(between(4.0, 5.2)), snf_pct: round(between(8.3, 8.9)), milking_method: machine ? 'Machine' : 'Hand',
          udder_cleaned: c.shed_id === 'SHD-02' ? r() < 0.8 : r() < 0.98, equipment_name: machine ? (k ? 'Milking Machine 2' : 'Milking Machine 1') : null,
          entered_by: sheds.find((x) => x.shed_id === (c.shed_id === 'SHD-05' ? 'SHD-05' : c.shed_id))?.supervisor_id });
      });
    });
    // diary per shed
    sheds.filter((sh) => sh.shed_type !== 'Store').forEach((sh) => {
      const here = cows.filter((c) => c.shed_id === sh.shed_id);
      if (!here.length) return;
      const ws = workersOf(sh.shed_id);
      const sum = (k) => here.reduce((t, c) => t + (planBy[c.plan_name]?.[k] || 0), 0);
      const task = (entry_type, time, item_id, qty, remarks) => {
        const w = ws.length ? pick(ws) : null;
        const rel = w ? w._rel : 0.9;
        const x = r();
        const status = x < rel ? 'Done' : x < rel + (1 - rel) * 0.75 ? 'Delayed' : 'Missed';
        const [h, m] = time.split(':').map(Number);
        const late = status === 'Delayed' ? int(30, 120) : int(0, 15);
        const done = status === 'Missed' ? null : `${pad(h + Math.floor((m + late) / 60), 2)}:${pad((m + late) % 60, 2)}`;
        daily_diary.push({ entry_id: `DRY-${pad(dn++, 5)}`, entry_date: date, entry_type, shed_id: sh.shed_id, scheduled_time: time, done_time: done,
          item_id, quantity_kg: status === 'Missed' ? null : qty, done_by: w?.staff_id || null, verified_by: sh.supervisor_id, status, remarks });
      };
      const ff = feedFactor[sh.shed_id] || 1;
      task('Feeding', '07:00', 'FD-01', Math.round(sum('green_fodder_kg') * ff * between(0.95, 1.03)), 'Green fodder');
      task('Feeding', '11:00', 'FD-02', Math.round(sum('dry_fodder_kg') * between(0.95, 1.03)), 'Dry fodder');
      task('Feeding', '16:00', 'FD-03', round(sum('concentrate_kg') * (sh.shed_id === 'SHD-02' ? 0.9 : 1) * between(0.95, 1.03)), 'Concentrate');
      task('Dung removal', '05:30', null, Math.round(here.length * between(9, 12)), 'Gobar collected (kg)');
      task('Dung removal', '17:30', null, Math.round(here.length * between(6, 9)), 'Gobar collected (kg)');
    });
    const tmax = Math.round(30 + 8 * Math.sin(((DAYS - d) / 60) * Math.PI) + between(-2, 2));
    daily_diary.push({ entry_id: `DRY-${pad(dn++, 5)}`, entry_date: date, entry_type: 'Weather', shed_id: null, scheduled_time: null, done_time: null, item_id: null,
      quantity_kg: null, done_by: managers[1].staff_id, verified_by: null, status: null,
      remarks: `Max ${tmax}°C, Min ${tmax - int(9, 13)}°C, Humidity ${int(30, 80)}%, ${pick(['Sunny', 'Sunny', 'Cloudy', 'Humid', 'Windy'])}` });
  }

  // ---------------- 11 health_records, 12 treatments ----------------
  const health_records = [];
  const treatments = [];
  const DISEASES = [
    { disease_name: 'Clinical Mastitis', disease_type: 'Bacterial', cause: 'Udder not cleaned before milking', med: ['MED-01', 'MED-03'], loss: [2000, 5000], milkOnly: true },
    { disease_name: 'Bloat', disease_type: 'Metabolic', cause: 'Too much wet green fodder', med: ['MED-04'], loss: [300, 1200] },
    { disease_name: 'Fever', disease_type: 'Viral', cause: 'Heat stress', med: ['MED-03'], loss: [500, 1500] },
    { disease_name: 'Tick infestation', disease_type: 'Parasitic', cause: 'Dirty bedding', med: ['MED-06'], loss: [200, 600] },
    { disease_name: 'Lameness', disease_type: 'Injury', cause: 'Wet floor', med: ['MED-03'], loss: [800, 2500] }
  ];
  const usedKey = new Set();
  for (let d = DAYS - 1; d >= 0; d -= int(1, 3)) {
    const date = daysAgo(d);
    const pool = cows.filter((c) => c.shed_id && c.shed_id !== 'SHD-06');
    let c = pick(pool);
    let dis = pick(DISEASES);
    if (dis.milkOnly) c = pick(pool.filter((x) => x.cow_type === 'Milking cow' && (r() < 0.65 ? (x._sickShed || x.shed_id) === 'SHD-02' : true)) ) || c;
    const key = c.cow_id + date;
    if (usedKey.has(key)) continue;
    usedKey.add(key);
    const routine = r() < 0.3;
    health_records.push({ cow_id: c.cow_id, check_date: date, vet_doctor_id: vet.staff_id, vet_assistant_id: vetAsst.staff_id,
      vet_accessibility: pick(['On-site', 'On-site', 'On-call']), condition: routine ? 'Routine check' : 'Sick',
      disease_name: routine ? null : dis.disease_name, disease_type: routine ? null : dis.disease_type, cause: routine ? null : dis.cause,
      food_habit: routine ? 'Normal' : pick(['Reduced appetite', 'Not eating', 'Normal']), economic_loss: routine ? 0 : int(...dis.loss),
      supervisor_remark: routine ? 'Healthy' : `Watch closely – ${dis.cause.toLowerCase()}`, _shed: c._sickShed || c.shed_id });
    const meds = routine ? (r() < 0.5 ? ['MED-02'] : ['MED-05']) : dis.med;
    meds.forEach((m) => treatments.push({ cow_id: c.cow_id, check_date: date, item_id: m, treatment_type: m === 'MED-02' ? 'Vaccination' : 'Treatment',
      dosage: m === 'MED-02' ? '3 ml s/c, single dose' : `${pick(['Once', 'Twice'])} daily, ${int(1, 5)} days`, start_date: date,
      end_date: addDays(date, int(0, 4)), given_by: pick([vet.staff_id, vetAsst.staff_id]), precautions: m === 'MED-01' ? 'Milk not sold till treatment ends' : '—',
      status: d < 4 ? 'Ongoing' : 'Completed', _qty: int(1, 6) }));
  }
  sickCows.forEach((c, i) => !usedKey.has(c.cow_id + daysAgo(i + 1)) && health_records.push({ cow_id: c.cow_id, check_date: daysAgo(i + 1) + '', vet_doctor_id: vet.staff_id, vet_assistant_id: vetAsst.staff_id,
    vet_accessibility: 'On-site', condition: 'Sick', disease_name: ['Clinical Mastitis', 'Fever', 'Lameness'][i], disease_type: ['Bacterial', 'Viral', 'Injury'][i],
    cause: ['Udder not cleaned before milking', 'Heat stress', 'Wet floor'][i], food_habit: 'Reduced appetite', economic_loss: int(1500, 4000),
    supervisor_remark: 'Under treatment', _shed: c._sickShed }));

  // ---------------- products, variants ----------------
  const PRODUCTS = [
    ['A2 Gir Cow Milk', 'Milk', 'Fresh A2 milk from desi Gir cows, delivered the same morning.', [['500 ml', 45], ['1 L', 80]]],
    ['Kesar Milk', 'Milk-based', 'Rich and creamy milk with saffron.', [['250 ml', 80]]],
    ['Badam Milk', 'Milk-based', 'Creamy milk blended with almonds.', [['250 ml', 90]]],
    ['A2 Buttermilk (Chaas)', 'Milk-based', 'Refreshing buttermilk for the whole family.', [['1 Bottle', 40]]],
    ['A2 Lassi', 'Milk-based', 'Traditional sweet lassi from A2 dahi.', [['250 ml', 40]]],
    ['A2 Dahi', 'Milk-based', 'Thick curd set in earthen pots.', [['500 g', 70]]],
    ['Fresh Paneer', 'Milk-based', 'Soft paneer from A2 milk.', [['200 g', 120], ['500 g', 280]]],
    ['Bilona Ghee', 'Milk-based', 'Hand-churned bilona ghee.', [['500 g', 1050], ['1 kg', 2000]]],
    ['White Butter (Makkhan)', 'Milk-based', 'Fresh white butter.', [['250 g', 180]]],
    ['Vermicompost', 'Organic fertilizer', 'Organic fertilizer for gardens.', [['5 kg', 150]]],
    ['Gobar Dhoop Sticks', 'Gobar-based', 'Natural dhoop from cow dung.', [['Pack of 20', 60]]],
    ['Gobar Diya', 'Gobar-based', 'Eco-friendly diyas.', [['Pack of 12', 80]]],
    ['Gomutra Ark', 'Urine-based', 'Distilled gomutra ark.', [['500 ml', 150]]],
    ['Organic Vegetables', 'Organic produce', 'Seasonal vegetables grown with own compost.', [['1 kg', 40]]],
    ['Biogas', 'Energy', 'Used in the farm kitchen and boiler.', [['m³', 0]]]
  ];
  const products = []; const product_variants = [];
  let vn = 1;
  PRODUCTS.forEach(([product_name, category, description, sizes], i) => {
    const product_id = `P-${pad(i + 1, 2)}`;
    products.push({ product_id, product_name, category, description, image_url: null, is_for_sale: category !== 'Energy' });
    sizes.forEach(([size, price]) => {
      product_variants.push({ variant_id: `V-${pad(vn++, 2)}`, product_id, size, price, reorder_level: category === 'Energy' ? null : int(5, 15), max_level: category === 'Energy' ? null : 100,
        is_active: category !== 'Energy' });
    });
  });

  // ---------------- profiles (customers), slots ----------------
  const AREAS = ['C-Scheme', 'Vaishali Nagar', 'Malviya Nagar', 'Mansarovar', 'Raja Park', 'Sanganer', 'Jagatpura'];
  const profiles = Array.from({ length: s.customers }, (_, i) => ({ profile_id: `uid-c${pad(i + 1)}`, full_name: person(), phone: phone(),
    email: r() < 0.4 ? `customer${i + 1}@mail.com` : null, _address: `${int(1, 200)}, ${pick(AREAS)}, Jaipur`,
    created_at: `${daysAgo(i < 4 ? int(0, 6) : int(10, DAYS + 200))} ${pad(int(8, 21), 2)}:${pad(int(0, 59), 2)}` }));
  const delivery_slots = [
    { slot_id: 'SL-01', slot_name: 'Morning', start_time: '06:00', end_time: '08:00', max_orders: 60, is_active: true },
    { slot_id: 'SL-02', slot_name: 'Evening', start_time: '17:00', end_time: '19:00', max_orders: 40, is_active: true }
  ];

  // ---------------- orders, order_items ----------------
  const orders = []; const order_items = [];
  let on = 1001;
  const sellable = product_variants.filter((v) => v.is_active);
  for (let d = DAYS - 1; d >= 0; d--) {
    const nOrders = int(1, 5);
    for (let k = 0; k < nOrders; k++) {
      const cust = pick(profiles);
      const order_id = `ORD-${on++}`;
      const st = d > 2 ? (r() < 0.06 ? 'Cancelled' : 'Delivered') : d === 2 ? 'Delivered' : d === 1 ? pick(['Out for delivery', 'Delivered']) : pick(['Placed', 'Placed', 'Packed']);
      const its = new Set(); const n = int(1, 3);
      let total = 0;
      for (let j = 0; j < n; j++) {
        const v = pick(sellable); if (its.has(v.variant_id)) continue; its.add(v.variant_id);
        const qty = int(1, 3); total += qty * v.price;
        order_items.push({ order_id, variant_id: v.variant_id, quantity: qty, unit_price: v.price });
      }
      const pay = pick(['UPI', 'UPI', 'Card', 'COD']);
      orders.push({ order_id, profile_id: cust.profile_id, order_date: daysAgo(d), order_type: pick(['One-time', 'One-time', 'Subscription', 'Repeat']),
        delivery_date: daysAgo(Math.max(0, d - 1)), slot_id: pick(delivery_slots).slot_id,
        driver_id: st === 'Placed' || st === 'Packed' ? null : pick(drivers).driver_id, delivery_address: cust._address, delivery_status: st,
        payment_mode: pay, amount_paid: pay === 'COD' && st !== 'Delivered' ? 0 : st === 'Cancelled' ? 0 : total });
    }
  }
  const cart_items = profiles.slice(0, 4).map((p) => ({ profile_id: p.profile_id, variant_id: pick(sellable).variant_id, quantity: int(1, 3), added_at: `${TODAY} 0${int(7, 9)}:15` }));

  // ---------------- production_log + stock_movements (stock never negative) ----------------
  const production_log = []; const stock_movements = [];
  const soldBy = {};
  order_items.forEach((oi) => { const o = orders.find((x) => x.order_id === oi.order_id); if (o.delivery_status !== 'Cancelled') soldBy[oi.variant_id] = (soldBy[oi.variant_id] || 0) + oi.quantity; });
  const INPUT = { 'Milk': ['Milk', 'Litre'], 'Milk-based': ['Milk', 'Litre'], 'Organic fertilizer': ['Gobar', 'Kg'], 'Gobar-based': ['Gobar', 'Kg'],
    'Urine-based': ['Gomutra', 'Litre'], 'Organic produce': ['Vermicompost', 'Kg'], 'Energy': ['Gobar', 'Kg'] };
  const cultWorkers = staff.filter((x) => x.department === 'Cultivation & By-products' && !['Manager', 'Supervisor'].includes(x.role));
  product_variants.forEach((v, idx) => {
    const p = products.find((x) => x.product_id === v.product_id);
    const sold = soldBy[v.variant_id] || 0;
    const low = idx % 6 === 3;                                   // a few variants end below reorder level
    const target = p.category === 'Energy' ? 0 : low ? int(0, Math.max(1, (v.reorder_level || 5) - 1)) : int((v.reorder_level || 5) + 5, 60);
    const opening = int(10, 30);
    const damaged = p.category.startsWith('Milk') ? int(0, 3) : 0;
    stock_movements.push({ variant_id: v.variant_id, moved_at: `${daysAgo(DAYS)} 06:00`, movement_type: 'Opening stock', quantity: opening, reason: 'Stock at start', done_by: purchaseMgr.staff_id });
    if (damaged) stock_movements.push({ variant_id: v.variant_id, moved_at: `${daysAgo(int(5, DAYS - 5))} 08:30`, movement_type: 'Damaged', quantity: -damaged, reason: 'Broken / spoiled', done_by: purchaseMgr.staff_id });
    let toMake = Math.max(0, sold + target - opening + damaged);
    if (p.category === 'Energy') toMake = 0;
    const batches = Math.max(1, Math.ceil(toMake / 25));
    for (let b = 0; b < batches && toMake > 0; b++) {
      const q = b === batches - 1 ? toMake : Math.ceil(toMake / batches);
      toMake -= q;
      const day = Math.round(DAYS - 1 - (b + 0.5) * ((DAYS - 1) / batches));
      const [mat, unit] = INPUT[p.category];
      production_log.push({ byproduct_id: v.variant_id, start_date: daysAgo(day + 1 + (idx % 3)), end_date: daysAgo(day), input_material: mat,
        input_qty: Math.round(q * (mat === 'Milk' ? between(0.6, 1.2) : between(2, 6))), input_unit: unit, output_qty: q, plot_area_acre: p.category === 'Organic produce' ? 0.5 : null,
        equipment_name: p.product_name === 'Bilona Ghee' ? 'Bilona Churning Machine' : null, made_by: pick(cultWorkers)?.staff_id || null,
        process_notes: p.product_name === 'Bilona Ghee' ? 'Bilona: curd set overnight, churned at dawn, slow heating' : 'As per standard process' });
    }
  });
  // biogas: weekly from gobar
  const bio = product_variants.find((v) => products.find((p) => p.product_id === v.product_id).category === 'Energy');
  for (let d = DAYS - 1; d >= 0; d -= 7) {
    production_log.push({ byproduct_id: bio.variant_id, start_date: daysAgo(d), end_date: daysAgo(Math.max(0, d - 6)), input_material: 'Gobar', input_qty: int(3000, 4000),
      input_unit: 'Kg', output_qty: int(120, 170), plot_area_acre: null, equipment_name: 'Biogas Plant (25 m³)', made_by: pick(cultWorkers)?.staff_id || null, process_notes: 'Used in kitchen and boiler' });
  }

  // ---------------- 9 purchases_expenses (12 months) ----------------
  const purchases_expenses = [];
  let tn = 1;
  const txn = (txn_date, category, item_id, supplier_id, quantity, amount, description) => purchases_expenses.push({ txn_id: `TXN-${pad(tn++, 4)}`, txn_date, category,
    item_id, supplier_id, quantity, amount: Math.round(amount), bill_number: `B-${int(1000, 9999)}`, description, entered_by: purchaseMgr.staff_id, approved_by: director.staff_id });
  const herd = cows.filter((c) => c.shed_id).length;
  for (let d = 364; d >= 0; d--) {
    const date = daysAgo(d);
    const dt = new Date(date);
    if (dt.getDay() === 1) { const q = Math.round(herd * 20 * 7 * between(0.9, 1.1)); txn(date, 'Feed purchase', 'FD-01', 'CT-001', q, q * priceOf['FD-01'], 'Green fodder for the week'); }
    if (dt.getDate() === 3) { const q = Math.round(herd * 6 * 30 * between(0.9, 1.1)); txn(date, 'Feed purchase', 'FD-02', 'CT-001', q, q * priceOf['FD-02'], 'Wheat bhoosa for the month'); }
    if (dt.getDate() === 5 || dt.getDate() === 20) { const q = Math.round(herd * 2.5 * 15 * between(0.9, 1.1)); txn(date, 'Feed purchase', 'FD-03', 'CT-001', q, q * priceOf['FD-03'], 'Daana'); }
    if (dt.getDate() === 8) { txn(date, 'Feed purchase', 'FD-04', 'CT-001', 60, 60 * priceOf['FD-04'], 'Mineral mixture');
      const m = pick(['MED-01', 'MED-02', 'MED-03', 'MED-05']); const q = int(20, 60); txn(date, 'Medicine purchase', m, 'CT-002', q, q * priceOf[m], 'Medicine stock'); }
    if (dt.getDate() === 1) {
      txn(date, 'Electricity', null, 'CT-004', null, between(15000, 24000), 'Electricity bill');
      txn(date, 'Salary', null, null, null, staff.reduce((t, x) => t + x.monthly_salary, 0), 'Monthly salary');
    }
    if (r() < 0.03) txn(date, 'Repair', null, 'CT-003', null, between(1500, 9000), pick(['Chaff cutter blade', 'Pump repair', 'Shed roof repair', 'Milking machine service']));
    if (r() < 0.04) txn(date, 'Other', null, null, null, between(500, 4000), pick(['Cleaning material', 'Stationery', 'Diesel', 'Festival decoration']));
  }

  // ---------------- 17 feedback, reviews, 18 seva ----------------
  const feedback = [
    { contact_id: 'CT-012', feedback_type: 'Enquiry', message: 'When is the next organic farming training?', received_at: `${daysAgo(2)} 09:05`, handled_by: financeMgr.staff_id, status: 'Open' },
    { contact_id: 'CT-005', feedback_type: 'Feedback', message: 'Gau seva arrangement was very good.', received_at: `${daysAgo(9)} 17:20`, handled_by: managers[0].staff_id, status: 'Closed' },
    { contact_id: 'CT-007', feedback_type: 'Enquiry', message: 'Can we bring 40 students for a visit?', received_at: `${daysAgo(1)} 11:40`, handled_by: null, status: 'Open' }
  ];
  const reviews = [];
  const seenRv = new Set();
  for (let i = 0; i < 25; i++) {
    const p = pick(profiles); const pr = pick(products.filter((x) => x.is_for_sale));
    if (seenRv.has(p.profile_id + pr.product_id)) continue; seenRv.add(p.profile_id + pr.product_id);
    const rating = pick([5, 5, 4, 4, 3]);
    reviews.push({ profile_id: p.profile_id, product_id: pr.product_id, rating, comment: { 5: 'Excellent quality!', 4: 'Good, will order again.', 3: 'Okay, delivery was late.' }[rating], created_at: `${daysAgo(int(0, DAYS))} 19:00` });
  }
  const seva_donations_visits = [];
  for (let i = 0; i < 30; i++) {
    const type = pick(['Donation', 'Donation', 'Donation', 'Pooja', 'Gau seva', 'Visit', 'Stay']);
    const online = r() < 0.5;
    const d = int(0, DAYS);
    seva_donations_visits.push({ entry_id: `SDV-${pad(i + 1)}`, contact_id: online ? null : pick(['CT-005', 'CT-006', 'CT-007', 'CT-008']), profile_id: online ? pick(profiles).profile_id : null,
      entry_type: type, purpose: { Donation: pick(['Green grass', 'Medical', 'Gud seva']), Pooja: 'Gau puja with pandit', 'Gau seva': 'Gud seva', Visit: 'Educational', Stay: 'Gau seva stay' }[type],
      start_date: daysAgo(d), end_date: type === 'Stay' ? daysAgo(Math.max(0, d - 2)) : null, group_size: type === 'Visit' ? int(10, 50) : 1,
      amount: type === 'Visit' ? 0 : pick([501, 1100, 2100, 5100, 11000]), payment_mode: pick(['UPI', 'Cash', 'Bank transfer']),
      receipt_number: type === 'Donation' ? `RCPT-${1000 + i}` : null, takeaway_given: pick(['Prasad', 'Prasad and 80G receipt', null]),
      handled_by: type === 'Pooja' ? staff.find((x) => x.role === 'Priest').staff_id : managers[4].staff_id, status: d < 3 ? 'Booked' : 'Completed' });
  }

  // ---------------- admin_users (login access) ----------------
  const admin_users = [];
  const giveAccess = (st, role, email) => admin_users.push({ user_id: `uid-a${st.staff_id.slice(-3)}`, staff_id: st.staff_id, access_role: role, is_active: true,
    created_at: `${daysAgo(int(5, 60))} 10:00`, email });
  giveAccess(director, 'Director', 'director@pinjrapole.org');
  const slug = { Health: 'health', Production: 'production', 'Cultivation & By-products': 'cultivation', Purchase: 'purchase', Finance: 'finance' };
  managers.forEach((m) => giveAccess(m, 'Manager', `${slug[m.department]}.manager@pinjrapole.org`));
  staff.filter((x) => x.role === 'Supervisor').forEach((x, i) => giveAccess(x, 'Supervisor', i === 1 ? 'supervisor@pinjrapole.org' : `supervisor${i + 1}@pinjrapole.org`));
  giveAccess(vet, 'Vet Doctor', 'vet@pinjrapole.org');
  const aWorker = workersOf('SHD-01')[0] || staff[staff.length - 1];
  giveAccess(aWorker, 'Worker', 'worker@pinjrapole.org');

  // remove helper fields
  cows.forEach((c) => { delete c._sickShed; });

  return {
    farm, farm_info, staff, sheds, equipment, cows, diet_plans, items, contacts, purchases_expenses, daily_diary, health_records, treatments,
    milk_production, production_log, orders, order_items, feedback, seva_donations_visits, profiles, products, product_variants, cart_items,
    delivery_slots, drivers, stock_movements, reviews, cow_movements, admin_users, shed_milk: []
  };
}
