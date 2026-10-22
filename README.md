# E-SDMART – Admin ERP (Pinjrapole Gaushala)

Admin panel for the gaushala: cows, milk, health, feed, diary, by-products,
orders, stock, contacts, feedback, donations, expenses, staff, sheds, equipment.

**Tech:** React + Vite + JavaScript + CSS + React Router + Recharts + Lucide icons.
Data is sample data for now (`src/data/sampleData.js`). Later it will come from Supabase.

## Demo logins (any password)
| Role | Email | Sees |
|---|---|---|
| Manager | manager@pinjrapole.org | All pages, add/edit |
| Director | director@pinjrapole.org | All pages + reports, view only |
| Supervisor | supervisor@pinjrapole.org | Farm pages only |
| Vet doctor | vet@pinjrapole.org | Cows, Health, Feed, Weather |

Who sees which page is set in `src/data/roles.js`.

## Run
```
npm install
npm run dev
```
Open http://localhost:5173

## Folder structure
```
src/
├── data/sampleData.js        ← sample data (same IDs as Customer & Delivery apps)
├── context/StoreContext.jsx  ← keeps data in memory, add/update functions
├── components/
│   ├── Layout.jsx            ← sidebar + top bar
│   ├── UI.jsx                ← Badge, StatCard, Modal, FormFields
│   └── TablePage.jsx         ← reusable table + search + filter + add form
├── pages/
│   ├── Login.jsx, Dashboard.jsx, Cows.jsx, CowProfile.jsx,
│   ├── Milk.jsx, Orders.jsx, Inventory.jsx, FarmInfo.jsx
│   └── tableConfigs.jsx      ← columns & forms for all other pages
├── App.jsx                   ← routes
└── index.css                 ← green theme
```

## Theme (same in all 3 apps)
Forest Green `#388C5B` · Soft Sage `#E8F2D8` · Light Lime `#D1E5AB` · Deep Green `#174B35` · White `#FFFFFF`
