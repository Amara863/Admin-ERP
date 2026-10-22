// Columns and form fields for every simple table page (same column names as Supabase).
// To add a new page: copy one block, change table name, columns and fields.
import { Link } from 'react-router-dom';
import { Badge, yesNo } from '../components/UI';
import { rupee, fmtDate } from '../context/StoreContext';
import { TODAY } from '../data/calc';

const cowLink = (id, { find }) => {
  const c = find('cows', id);
  return c ? <Link to={`/cows/${id}`} className="strong" onClick={(e) => e.stopPropagation()}>{c.cow_name} <span className="muted">({id})</span></Link> : (id || '—');
};
const cowOptions = ({ db }) => db.cows.map((c) => ({ value: c.cow_id, label: `${c.cow_name} (${c.cow_id})` }));
const staffOptions = ({ db }, roles) => db.staff.filter((s) => !roles || roles.includes(s.role)).map((s) => ({ value: s.staff_id, label: `${s.name} – ${s.role}` }));
const shedOptions = ({ db }) => db.sheds.map((s) => ({ value: s.shed_id, label: s.shed_name }));
const itemOptions = ({ db }, group) => db.items.filter((i) => !group || i.item_group === group).map((i) => ({ value: i.item_id, label: i.item_name }));
const contactOptions = ({ db }, type) => db.contacts.filter((c) => !type || c.contact_type === type).map((c) => ({ value: c.contact_id, label: `${c.name} (${c.contact_type})` }));
const variantOptions = (s) => s.db.product_variants.map((v) => ({ value: v.variant_id, label: s.variantName(v.variant_id) }));
const profileOptions = ({ db }) => db.profiles.map((p) => ({ value: p.profile_id, label: `${p.full_name} (${p.phone})` }));
const desc = (k) => (a, b) => (a[k] < b[k] ? 1 : a[k] > b[k] ? -1 : 0);
const name = (t, k) => ({ render: (r, s) => s.nameOf(t, r[k]), text: (r, s) => s.nameOf(t, r[k]) });

// ---------- HEALTH ----------
export const healthTabs = [
  {
    tabLabel: 'Health records', table: 'health_records', singular: 'Health record', addLabel: 'Add health record',
    filterKey: 'condition', sort: desc('check_date'), defaults: { check_date: TODAY, condition: 'Sick', vet_accessibility: 'On-site' },
    columns: [
      { label: 'Date', render: (r) => fmtDate(r.check_date), text: (r) => r.check_date },
      { label: 'Cow', render: (r, s) => cowLink(r.cow_id, s), text: (r, s) => s.nameOf('cows', r.cow_id) },
      { label: 'Condition', render: (r) => <Badge tone={r.condition === 'Sick' ? 'red' : 'green'}>{r.condition}</Badge>, text: (r) => r.condition },
      { label: 'Disease', render: (r) => r.disease_name ? <>{r.disease_name} <span className="muted">({r.disease_type})</span></> : '—', text: (r) => r.disease_name },
      { label: 'Cause', key: 'cause' },
      { label: 'Food habit', key: 'food_habit' },
      { label: 'Doctor', ...name('staff', 'vet_doctor_id') },
      { label: 'Loss', num: true, render: (r) => (r.economic_loss ? rupee(r.economic_loss) : '—') },
      { label: 'Supervisor remark', key: 'supervisor_remark' }
    ],
    fields: (s) => [
      { key: 'cow_id', label: 'Cow', type: 'select', options: cowOptions(s), required: true },
      { key: 'check_date', label: 'Check date', type: 'date', required: true },
      { key: 'condition', label: 'Condition', type: 'select', options: ['Sick', 'Routine check', 'Injury', 'Pregnancy check'], required: true },
      { key: 'vet_accessibility', label: 'Vet available', type: 'select', options: ['On-site', 'On-call'] },
      { key: 'vet_doctor_id', label: 'Vet doctor', type: 'select', options: staffOptions(s, ['Vet Doctor']) },
      { key: 'vet_assistant_id', label: 'Vet assistant', type: 'select', options: staffOptions(s, ['Vet Assistant']) },
      { key: 'disease_name', label: 'Disease name' },
      { key: 'disease_type', label: 'Disease type', type: 'select', options: ['Bacterial', 'Viral', 'Parasitic', 'Metabolic', 'Injury', 'Other'] },
      { key: 'cause', label: 'Cause', full: true },
      { key: 'food_habit', label: 'Food habit', type: 'select', options: ['Normal', 'Reduced appetite', 'Not eating'] },
      { key: 'economic_loss', label: 'Economic loss (₹)', type: 'number' },
      { key: 'supervisor_remark', label: 'Supervisor remark', full: true }
    ]
  },
  {
    tabLabel: 'Treatments (medicine given)', table: 'treatments', singular: 'Treatment', addLabel: 'Add treatment',
    filterKey: 'status', sort: desc('check_date'), defaults: { check_date: TODAY, start_date: TODAY, status: 'Ongoing', treatment_type: 'Treatment' },
    columns: [
      { label: 'Check date', render: (r) => fmtDate(r.check_date), text: (r) => r.check_date },
      { label: 'Cow', render: (r, s) => cowLink(r.cow_id, s), text: (r, s) => s.nameOf('cows', r.cow_id) },
      { label: 'Medicine', ...name('items', 'item_id') },
      { label: 'Type', key: 'treatment_type' },
      { label: 'Dosage', key: 'dosage' },
      { label: 'Start – End', render: (r) => `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}` },
      { label: 'Given by', ...name('staff', 'given_by') },
      { label: 'Precautions', key: 'precautions' },
      { label: 'Status', render: (r) => <Badge>{r.status}</Badge>, text: (r) => r.status }
    ],
    fields: (s) => [
      { key: 'cow_id', label: 'Cow', type: 'select', options: cowOptions(s), required: true },
      { key: 'check_date', label: 'Check date (health record)', type: 'date', required: true },
      { key: 'item_id', label: 'Medicine', type: 'select', options: itemOptions(s, 'Medicine'), required: true },
      { key: 'treatment_type', label: 'Type', type: 'select', options: ['Treatment', 'Vaccination', 'Deworming'] },
      { key: 'dosage', label: 'Dosage' },
      { key: 'given_by', label: 'Given by', type: 'select', options: staffOptions(s, ['Vet Doctor', 'Vet Assistant']) },
      { key: 'start_date', label: 'Start date', type: 'date' },
      { key: 'end_date', label: 'End date', type: 'date' },
      { key: 'precautions', label: 'Precautions', full: true },
      { key: 'status', label: 'Status', type: 'select', options: ['Ongoing', 'Completed'] }
    ]
  }
];

// ---------- DAILY DIARY ----------
export const diaryTabs = [
  {
    tabLabel: 'Daily diary', table: 'daily_diary', singular: 'Diary entry', addLabel: 'Add diary entry',
    filterKey: 'status', filterOptions: ['Done', 'Delayed', 'Missed'], sort: (a, b) => (a.entry_date < b.entry_date ? 1 : a.entry_date > b.entry_date ? -1 : (a.scheduled_time || '') < (b.scheduled_time || '') ? -1 : 1),
    baseFilter: (r) => r.entry_type !== 'Weather', defaults: { entry_date: TODAY, entry_type: 'Feeding', status: 'Done' },
    columns: [
      { label: 'Date', render: (r) => fmtDate(r.entry_date), text: (r) => r.entry_date },
      { label: 'Shed', ...name('sheds', 'shed_id') },
      { label: 'Work', render: (r) => <><b>{r.entry_type}</b> <span className="muted">{r.remarks}</span></>, text: (r) => r.entry_type + ' ' + r.remarks },
      { label: 'Item', render: (r, s) => (r.item_id ? s.nameOf('items', r.item_id) : '—') },
      { label: 'Qty (kg)', num: true, key: 'quantity_kg' },
      { label: 'Time (plan / done)', render: (r) => `${r.scheduled_time || '—'} / ${r.done_time || '—'}` },
      { label: 'Done by', ...name('staff', 'done_by') },
      { label: 'Verified by', ...name('staff', 'verified_by') },
      { label: 'Status', render: (r) => <Badge>{r.status}</Badge>, text: (r) => r.status }
    ],
    fields: (s) => [
      { key: 'entry_date', label: 'Date', type: 'date', required: true },
      { key: 'entry_type', label: 'Work', type: 'select', options: ['Feeding', 'Dung removal', 'Watering', 'Cleaning', 'Observation'], required: true },
      { key: 'shed_id', label: 'Shed', type: 'select', options: shedOptions(s), required: true },
      { key: 'item_id', label: 'Feed item', type: 'select', options: itemOptions(s, 'Feed') },
      { key: 'quantity_kg', label: 'Quantity (kg)', type: 'number' },
      { key: 'scheduled_time', label: 'Scheduled time', type: 'time' },
      { key: 'done_time', label: 'Done time', type: 'time' },
      { key: 'done_by', label: 'Done by (worker)', type: 'select', options: staffOptions(s) },
      { key: 'verified_by', label: 'Verified by', type: 'select', options: staffOptions(s, ['Supervisor', 'Manager']) },
      { key: 'status', label: 'Status', type: 'select', options: ['Done', 'Delayed', 'Missed'] },
      { key: 'remarks', label: 'Remarks', full: true }
    ]
  }
];

// ---------- BY-PRODUCTS ----------
export const productionTabs = [
  {
    tabLabel: 'Production log', table: 'production_log', singular: 'Batch', addLabel: 'Add production batch',
    filterKey: 'input_material', sort: desc('start_date'), defaults: { start_date: TODAY, input_material: 'Milk', input_unit: 'Litre' },
    columns: [
      { label: 'Product', render: (r, s) => <span className="strong">{s.variantName(r.byproduct_id)}</span>, text: (r, s) => s.variantName(r.byproduct_id) },
      { label: 'Start', render: (r) => fmtDate(r.start_date), text: (r) => r.start_date },
      { label: 'End', render: (r) => fmtDate(r.end_date) },
      { label: 'Input', render: (r) => `${r.input_qty} ${r.input_unit} ${r.input_material}`, text: (r) => r.input_material },
      { label: 'Output', num: true, key: 'output_qty' },
      { label: 'Equipment', key: 'equipment_name' },
      { label: 'Made by', ...name('staff', 'made_by') },
      { label: 'Notes', key: 'process_notes' }
    ],
    fields: (s) => [
      { key: 'byproduct_id', label: 'Product (size)', type: 'select', options: variantOptions(s), required: true },
      { key: 'start_date', label: 'Start date', type: 'date', required: true },
      { key: 'end_date', label: 'End date', type: 'date' },
      { key: 'input_material', label: 'Input material', type: 'select', options: ['Milk', 'Gobar', 'Gomutra', 'Vermicompost', 'Other'] },
      { key: 'input_qty', label: 'Input quantity', type: 'number' },
      { key: 'input_unit', label: 'Input unit', type: 'select', options: ['Litre', 'Kg'] },
      { key: 'output_qty', label: 'Output quantity (units)', type: 'number', required: true },
      { key: 'plot_area_acre', label: 'Plot area (acre)', type: 'number' },
      { key: 'equipment_name', label: 'Equipment', type: 'select', options: s.db.equipment.map((e) => e.equipment_name) },
      { key: 'made_by', label: 'Made by', type: 'select', options: staffOptions(s) },
      { key: 'process_notes', label: 'Process notes', full: true }
    ]
  }
];

// ---------- FEED & MEDICINE STOCK ----------
export const itemTabs = [
  {
    tabLabel: 'Items', table: 'items', singular: 'Item', addLabel: 'Add item', filterKey: 'item_group',
    columns: [
      { label: 'Item ID', key: 'item_id' },
      { label: 'Name', render: (r) => <span className="strong">{r.item_name}</span>, text: (r) => r.item_name },
      { label: 'Group', key: 'item_group' },
      { label: 'Type', key: 'item_type' },
      { label: 'Price', num: true, render: (r) => `${rupee(r.price)} / ${r.unit}` },
      { label: 'In stock', num: true, render: (r) => `${r.stock_qty} ${r.unit}` },
      { label: 'Reorder at', num: true, key: 'reorder_level' },
      { label: 'Stock value', num: true, render: (r) => rupee(r.stock_qty * r.price) },
      { label: 'Depreciation', num: true, render: (r) => `${r.depreciation_pct ?? 0}%` },
      { label: 'Expiry', render: (r) => fmtDate(r.expiry_date) },
      { label: 'Status', render: (r) => <Badge>{r.stock_qty < r.reorder_level ? 'Low stock' : 'In stock'}</Badge> }
    ],
    fields: [
      { key: 'item_id', label: 'Item ID', required: true },
      { key: 'item_name', label: 'Name', required: true },
      { key: 'item_group', label: 'Group', type: 'select', options: ['Feed', 'Medicine'], required: true },
      { key: 'item_type', label: 'Type' },
      { key: 'unit', label: 'Unit', type: 'select', options: ['Kg', 'Litre', 'Dose', 'Vial', 'Tube', 'Bottle'] },
      { key: 'price', label: 'Price per unit (₹)', type: 'number' },
      { key: 'stock_qty', label: 'Stock quantity', type: 'number' },
      { key: 'reorder_level', label: 'Reorder level', type: 'number' },
      { key: 'depreciation_pct', label: 'Depreciation %', type: 'number' },
      { key: 'expiry_date', label: 'Expiry date', type: 'date' }
    ]
  }
];

// ---------- COW STOCK (in / out) ----------
export const cowMoveTabs = [
  {
    tabLabel: 'Movements', table: 'cow_movements', singular: 'Movement', addLabel: 'Add cow in / out', filterKey: 'movement_type',
    sort: desc('movement_date'), defaults: { movement_date: TODAY, movement_type: 'Sold' },
    columns: [
      { label: 'Date', render: (r) => fmtDate(r.movement_date), text: (r) => r.movement_date },
      { label: 'Cow', render: (r, s) => cowLink(r.cow_id, s), text: (r, s) => s.nameOf('cows', r.cow_id) },
      { label: 'In / Out', render: (r) => <Badge>{r.movement_type}</Badge>, text: (r) => r.movement_type },
      { label: 'From / To', render: (r, s) => (r.contact_id ? s.nameOf('contacts', r.contact_id) : '—') },
      { label: 'Amount', num: true, render: (r) => (r.amount ? rupee(r.amount) : '—') },
      { label: 'Remarks', key: 'remarks' },
      { label: 'Entered by', ...name('staff', 'entered_by') }
    ],
    fields: (s) => [
      { key: 'cow_id', label: 'Cow', type: 'select', options: cowOptions(s), required: true },
      { key: 'movement_date', label: 'Date', type: 'date', required: true },
      { key: 'movement_type', label: 'Type', type: 'select', options: ['Purchased', 'Donated in', 'Rescued', 'Sold', 'Given away', 'Died'], required: true },
      { key: 'contact_id', label: 'From / To (contact)', type: 'select', options: contactOptions(s) },
      { key: 'amount', label: 'Amount (₹)', type: 'number' },
      { key: 'entered_by', label: 'Entered by', type: 'select', options: staffOptions(s, ['Manager', 'Supervisor', 'Director']) },
      { key: 'remarks', label: 'Remarks', full: true }
    ]
  }
];

// ---------- CUSTOMERS / DRIVERS / SLOTS ----------
export const customerTabs = [
  {
    tabLabel: 'Customers', table: 'profiles', singular: 'Customer', addLabel: 'Add customer', sort: desc('created_at'),
    columns: [
      { label: 'Name', render: (r) => <span className="strong">{r.full_name}</span>, text: (r) => r.full_name },
      { label: 'Phone', key: 'phone' },
      { label: 'Email', key: 'email' },
      { label: 'Orders', num: true, render: (r, s) => s.db.orders.filter((o) => o.profile_id === r.profile_id).length },
      { label: 'Joined', render: (r) => fmtDate(r.created_at), text: (r) => r.created_at }
    ],
    fields: [
      { key: 'full_name', label: 'Full name', required: true },
      { key: 'phone', label: 'Phone', required: true },
      { key: 'email', label: 'Email', type: 'email' }
    ],
    defaults: () => ({ created_at: new Date().toISOString().slice(0, 16).replace('T', ' ') })
  },
  {
    tabLabel: 'Cart (not ordered yet)', table: 'cart_items', singular: 'Cart item', readOnly: true,
    columns: [
      { label: 'Customer', ...name('profiles', 'profile_id') },
      { label: 'Product', render: (r, s) => s.variantName(r.variant_id), text: (r, s) => s.variantName(r.variant_id) },
      { label: 'Qty', num: true, key: 'quantity' },
      { label: 'Added at', key: 'added_at' }
    ]
  }
];

export const driverTabs = [
  {
    tabLabel: 'Drivers', table: 'drivers', singular: 'Driver', addLabel: 'Add driver',
    columns: [
      { label: 'Driver', render: (r, s) => <span className="strong">{s.nameOf('staff', r.driver_id)}</span>, text: (r, s) => s.nameOf('staff', r.driver_id) },
      { label: 'Mobile', render: (r, s) => s.find('staff', r.driver_id)?.mobile },
      { label: 'Vehicle', key: 'vehicle_number' },
      { label: 'Licence', key: 'licence_number' },
      { label: 'Area', key: 'delivery_area' },
      { label: 'Deliveries', num: true, render: (r, s) => s.db.orders.filter((o) => o.driver_id === r.driver_id && o.delivery_status === 'Delivered').length },
      { label: 'App login', render: (r) => <Badge>{r.user_id ? 'Yes' : 'No'}</Badge> },
      { label: 'Available', render: (r) => <Badge>{yesNo(r.is_available)}</Badge> }
    ],
    fields: (s) => [
      { key: 'driver_id', label: 'Staff (driver)', type: 'select', options: staffOptions(s, ['Driver']), required: true },
      { key: 'vehicle_number', label: 'Vehicle number', required: true },
      { key: 'licence_number', label: 'Licence number' },
      { key: 'delivery_area', label: 'Delivery area', full: true },
      { key: 'is_available', label: 'Available', type: 'checkbox' }
    ]
  }
];

export const slotTabs = [
  {
    tabLabel: 'Slots', table: 'delivery_slots', singular: 'Slot', addLabel: 'Add slot',
    columns: [
      { label: 'Slot', render: (r) => <span className="strong">{r.slot_name}</span>, text: (r) => r.slot_name },
      { label: 'Time', render: (r) => `${r.start_time} – ${r.end_time}` },
      { label: 'Max orders', num: true, key: 'max_orders' },
      { label: 'Booked today', num: true, render: (r, s) => s.db.orders.filter((o) => o.slot_id === r.slot_id && o.delivery_date === TODAY).length },
      { label: 'Active', render: (r) => <Badge>{yesNo(r.is_active)}</Badge> }
    ],
    fields: [
      { key: 'slot_name', label: 'Slot name', required: true },
      { key: 'max_orders', label: 'Max orders', type: 'number' },
      { key: 'start_time', label: 'Start time', type: 'time' },
      { key: 'end_time', label: 'End time', type: 'time' },
      { key: 'is_active', label: 'Active', type: 'checkbox' }
    ]
  }
];

// ---------- FEEDBACK & REVIEWS ----------
export const feedbackTabs = [
  {
    tabLabel: 'Feedback & enquiry', table: 'feedback', singular: 'Feedback', addLabel: 'Add feedback', filterKey: 'status', sort: desc('received_at'),
    defaults: { status: 'Open', feedback_type: 'Enquiry' },
    columns: [
      { label: 'Received', key: 'received_at' },
      { label: 'From', ...name('contacts', 'contact_id') },
      { label: 'Type', key: 'feedback_type' },
      { label: 'Message', key: 'message' },
      { label: 'Handled by', ...name('staff', 'handled_by') },
      { label: 'Status', render: (r) => <Badge>{r.status}</Badge>, text: (r) => r.status }
    ],
    fields: (s) => [
      { key: 'contact_id', label: 'Contact', type: 'select', options: contactOptions(s), required: true },
      { key: 'received_at', label: 'Received at', type: 'datetime-local', required: true },
      { key: 'feedback_type', label: 'Type', type: 'select', options: ['Enquiry', 'Feedback', 'Complaint'] },
      { key: 'handled_by', label: 'Handled by', type: 'select', options: staffOptions(s) },
      { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Closed'] },
      { key: 'message', label: 'Message', type: 'textarea', full: true }
    ]
  },
  {
    tabLabel: 'Product reviews', table: 'reviews', singular: 'Review', filterKey: 'rating', sort: desc('created_at'), readOnly: true,
    columns: [
      { label: 'Date', render: (r) => fmtDate(r.created_at), text: (r) => r.created_at },
      { label: 'Customer', ...name('profiles', 'profile_id') },
      { label: 'Product', ...name('products', 'product_id') },
      { label: 'Rating', render: (r) => '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating), text: (r) => r.rating },
      { label: 'Comment', key: 'comment' }
    ]
  }
];

// ---------- SEVA ----------
export const sevaTabs = [
  {
    tabLabel: 'Donations & visits', table: 'seva_donations_visits', singular: 'Entry', addLabel: 'Add entry', filterKey: 'entry_type', sort: desc('start_date'),
    defaults: { start_date: TODAY, entry_type: 'Donation', status: 'Completed', group_size: 1 },
    columns: [
      { label: 'Date', render: (r) => fmtDate(r.start_date), text: (r) => r.start_date },
      { label: 'Type', render: (r) => <Badge tone="lime">{r.entry_type}</Badge>, text: (r) => r.entry_type },
      { label: 'By', render: (r, s) => (r.profile_id ? <>{s.nameOf('profiles', r.profile_id)} <span className="muted">(online)</span></> : s.nameOf('contacts', r.contact_id)), text: (r, s) => s.nameOf('profiles', r.profile_id) + s.nameOf('contacts', r.contact_id) },
      { label: 'Purpose', key: 'purpose' },
      { label: 'People', num: true, key: 'group_size' },
      { label: 'Amount', num: true, render: (r) => (r.amount ? rupee(r.amount) : '—') },
      { label: 'Payment', key: 'payment_mode' },
      { label: 'Receipt', key: 'receipt_number' },
      { label: 'Status', render: (r) => <Badge>{r.status}</Badge>, text: (r) => r.status }
    ],
    fields: (s) => [
      { key: 'entry_type', label: 'Type', type: 'select', options: ['Donation', 'Pooja', 'Gau seva', 'Visit', 'Stay'], required: true },
      { key: 'start_date', label: 'Date', type: 'date', required: true },
      { key: 'contact_id', label: 'Contact (offline)', type: 'select', options: contactOptions(s) },
      { key: 'profile_id', label: 'Customer (online)', type: 'select', options: profileOptions(s) },
      { key: 'purpose', label: 'Purpose' },
      { key: 'end_date', label: 'End date (stay)', type: 'date' },
      { key: 'group_size', label: 'People', type: 'number' },
      { key: 'amount', label: 'Amount (₹)', type: 'number' },
      { key: 'payment_mode', label: 'Payment', type: 'select', options: ['UPI', 'Cash', 'Bank transfer', 'Card'] },
      { key: 'receipt_number', label: 'Receipt no.' },
      { key: 'takeaway_given', label: 'Takeaway given' },
      { key: 'handled_by', label: 'Handled by', type: 'select', options: staffOptions(s) },
      { key: 'status', label: 'Status', type: 'select', options: ['Booked', 'Completed', 'Cancelled'] }
    ]
  }
];

// ---------- EXPENSES ----------
export const expenseTabs = [
  {
    tabLabel: 'Purchases & expenses', table: 'purchases_expenses', singular: 'Expense', addLabel: 'Add expense', filterKey: 'category', sort: desc('txn_date'),
    defaults: { txn_date: TODAY, category: 'Feed purchase' },
    columns: [
      { label: 'Date', render: (r) => fmtDate(r.txn_date), text: (r) => r.txn_date },
      { label: 'Category', key: 'category' },
      { label: 'Item', render: (r, s) => (r.item_id ? s.nameOf('items', r.item_id) : '—') },
      { label: 'Supplier', render: (r, s) => (r.supplier_id ? s.nameOf('contacts', r.supplier_id) : '—') },
      { label: 'Qty', num: true, key: 'quantity' },
      { label: 'Amount', num: true, render: (r) => <b>{rupee(r.amount)}</b>, text: (r) => r.amount },
      { label: 'Bill no.', key: 'bill_number' },
      { label: 'Description', key: 'description' },
      { label: 'Approved by', ...name('staff', 'approved_by') }
    ],
    fields: (s) => [
      { key: 'txn_date', label: 'Date', type: 'date', required: true },
      { key: 'category', label: 'Category', type: 'select', options: ['Feed purchase', 'Medicine purchase', 'Electricity', 'Salary', 'Repair', 'Other'], required: true },
      { key: 'item_id', label: 'Item', type: 'select', options: itemOptions(s) },
      { key: 'supplier_id', label: 'Supplier', type: 'select', options: contactOptions(s, 'Supplier') },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'amount', label: 'Amount (₹)', type: 'number', required: true },
      { key: 'bill_number', label: 'Bill number' },
      { key: 'entered_by', label: 'Entered by', type: 'select', options: staffOptions(s) },
      { key: 'approved_by', label: 'Approved by', type: 'select', options: staffOptions(s, ['Director', 'Manager']) },
      { key: 'description', label: 'Description', full: true }
    ]
  }
];

// ---------- STAFF ----------
export const staffTable = {
  tabLabel: 'All staff', table: 'staff', singular: 'Staff member', addLabel: 'Add staff', filterKey: 'department',
  defaults: { annual_leaves: 24, remaining_leaves: 24, overtime_hours: 0, skill_type: 'Unskilled', shift: 'Morning' },
  columns: [
    { label: 'ID', key: 'staff_id' },
    { label: 'Name', render: (r) => <span className="strong">{r.name}</span>, text: (r) => r.name },
    { label: 'Role', render: (r) => <>{r.role}<div className="muted">{r.department}</div></>, text: (r) => r.role + ' ' + r.department },
    { label: 'Reports to', render: (r, s) => { const b = r.reports_to || s.find('sheds', r.shed_id)?.supervisor_id; return b ? s.nameOf('staff', b) : '—'; } },
    { label: 'Shed', render: (r, s) => (r.shed_id ? s.nameOf('sheds', r.shed_id) : '—') },
    { label: 'Skill', render: (r) => <Badge>{r.skill_type}</Badge>, text: (r) => r.skill_type },
    { label: 'Shift', key: 'shift' },
    { label: 'Mobile', key: 'mobile' },
    { label: 'Salary', num: true, render: (r) => rupee(r.monthly_salary) },
    { label: 'Leaves left', num: true, render: (r) => `${r.remaining_leaves}/${r.annual_leaves}` },
    { label: 'Overtime (h)', num: true, key: 'overtime_hours' }
  ],
  fields: (s) => [
    { key: 'name', label: 'Name', required: true },
    { key: 'dob', label: 'Date of birth', type: 'date' },
    { key: 'role', label: 'Role', type: 'select', options: ['Director', 'Manager', 'Supervisor', 'Vet Doctor', 'Vet Assistant', 'Milker', 'Feeder', 'Cleaner', 'Field worker', 'Biogas operator', 'Store helper', 'Accountant', 'Driver', 'Priest'], required: true },
    { key: 'department', label: 'Department', type: 'select', options: ['Management', 'Health', 'Production', 'Cultivation & By-products', 'Purchase', 'Finance', 'Veterinary', 'Seva'] },
    { key: 'reports_to', label: 'Reports to (leave empty for shed workers)', type: 'select', options: staffOptions(s, ['Director', 'Manager', 'Supervisor', 'Vet Doctor']) },
    { key: 'shed_id', label: 'Shed', type: 'select', options: shedOptions(s) },
    { key: 'skill_type', label: 'Skill', type: 'select', options: ['Skilled', 'Unskilled'] },
    { key: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Evening', 'General'] },
    { key: 'mobile', label: 'Mobile' },
    { key: 'qualification', label: 'Qualification' },
    { key: 'joined_on', label: 'Joined on', type: 'date' },
    { key: 'monthly_salary', label: 'Monthly salary (₹)', type: 'number' },
    { key: 'last_increment_date', label: 'Last increment date', type: 'date' },
    { key: 'overtime_hours', label: 'Overtime hours (month)', type: 'number' },
    { key: 'annual_leaves', label: 'Leaves per year', type: 'number' },
    { key: 'remaining_leaves', label: 'Remaining leaves', type: 'number' },
    { key: 'hygiene_trained', label: 'Hygiene trained', type: 'checkbox' },
    { key: 'training_date', label: 'Training date', type: 'date' }
  ]
};

// ---------- SHEDS / EQUIPMENT / CONTACTS ----------
export const shedTabs = [
  {
    tabLabel: 'Sheds', table: 'sheds', singular: 'Shed', addLabel: 'Add shed',
    columns: [
      { label: 'Shed', render: (r) => <><span className="strong">{r.shed_name}</span><div className="muted">{r.shed_id}</div></>, text: (r) => r.shed_name },
      { label: 'Type', key: 'shed_type' },
      { label: 'Area (sq ft)', num: true, key: 'area_sq_ft' },
      { label: 'Cows / capacity', num: true, render: (r, s) => `${s.db.cows.filter((c) => c.shed_id === r.shed_id).length} / ${r.capacity}` },
      { label: 'Workers', num: true, render: (r, s) => s.db.staff.filter((x) => x.shed_id === r.shed_id && !['Supervisor', 'Manager'].includes(x.role)).length },
      { label: 'Supervisor', ...name('staff', 'supervisor_id') },
      { label: 'Doctor', ...name('staff', 'doctor_id') }
    ],
    fields: (s) => [
      { key: 'shed_name', label: 'Shed name', required: true },
      { key: 'shed_type', label: 'Type', type: 'select', options: ['Milking', 'Dry', 'Calf & Heifer', 'Hospital', 'Store'] },
      { key: 'area_sq_ft', label: 'Area (sq ft)', type: 'number' },
      { key: 'capacity', label: 'Capacity (cows)', type: 'number' },
      { key: 'supervisor_id', label: 'Supervisor', type: 'select', options: staffOptions(s, ['Supervisor']) },
      { key: 'doctor_id', label: 'Doctor', type: 'select', options: staffOptions(s, ['Vet Doctor']) }
    ]
  }
];

export const equipmentTabs = [
  {
    tabLabel: 'Equipment', table: 'equipment', singular: 'Equipment', addLabel: 'Add equipment', filterKey: 'equipment_type',
    columns: [
      { label: 'Name', render: (r) => <span className="strong">{r.equipment_name}</span>, text: (r) => r.equipment_name },
      { label: 'Type', key: 'equipment_type' },
      { label: 'Shed', ...name('sheds', 'shed_id') },
      { label: 'Supplier', ...name('contacts', 'supplier_id') },
      { label: 'Bought', render: (r) => fmtDate(r.purchase_date) },
      { label: 'Cost', num: true, render: (r) => rupee(r.purchase_cost) },
      { label: 'Last service', render: (r) => fmtDate(r.last_service_date) },
      { label: 'Status', render: (r) => <Badge>{r.status}</Badge>, text: (r) => r.status }
    ],
    fields: (s) => [
      { key: 'equipment_name', label: 'Name (unique)', required: true },
      { key: 'equipment_type', label: 'Type', type: 'select', options: ['Milking', 'Fodder cutting', 'Transport', 'Processing', 'Energy', 'Watering', 'Camera', 'IoT sensor'] },
      { key: 'shed_id', label: 'Shed', type: 'select', options: shedOptions(s) },
      { key: 'supplier_id', label: 'Supplier', type: 'select', options: contactOptions(s, 'Supplier') },
      { key: 'purchase_date', label: 'Purchase date', type: 'date' },
      { key: 'purchase_cost', label: 'Cost (₹)', type: 'number' },
      { key: 'last_service_date', label: 'Last service', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Working', 'Under repair', 'Not in use'] },
      { key: 'stream_url', label: 'Camera stream URL', full: true },
      { key: 'is_public', label: 'Show camera on website', type: 'checkbox' }
    ]
  }
];

export const contactTabs = [
  {
    tabLabel: 'Contacts', table: 'contacts', singular: 'Contact', addLabel: 'Add contact', filterKey: 'contact_type', defaults: { contact_type: 'Supplier', joined_on: TODAY },
    columns: [
      { label: 'Name', render: (r) => <span className="strong">{r.name}</span>, text: (r) => r.name },
      { label: 'Type', render: (r) => <Badge tone="blue">{r.contact_type}</Badge>, text: (r) => r.contact_type },
      { label: 'Mobile', key: 'mobile' },
      { label: 'Address', key: 'address' },
      { label: 'GST', key: 'gst_number' },
      { label: 'Since', render: (r) => fmtDate(r.joined_on) }
    ],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'contact_type', label: 'Type', type: 'select', options: ['Supplier', 'Donor', 'Visitor', 'Other'], required: true },
      { key: 'mobile', label: 'Mobile' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'gst_number', label: 'GST number' },
      { key: 'joined_on', label: 'Since', type: 'date' },
      { key: 'address', label: 'Address', full: true }
    ]
  }
];