// Who can see which page, and who can add / edit on it.
// view = page shows in the sidebar, edit = Add / Edit / Delete buttons are shown.
// Later the same rules go into Supabase (Row Level Security).

const ALL = ['/', '/reports', '/cows', '/cow-stock', '/milk', '/health', '/feed', '/diary', '/weather', '/production',
  '/products', '/feed-stock', '/orders', '/customers', '/drivers', '/slots', '/feedback', '/seva',
  '/expenses', '/staff', '/sheds', '/equipment', '/contacts', '/users', '/farm', '/settings'];

const FARM = ['/', '/reports', '/cows', '/cow-stock', '/milk', '/health', '/feed', '/diary', '/weather', '/production',
  '/feed-stock', '/staff', '/sheds', '/equipment'];

export const ACCESS = {
  'Director':   { view: ALL, edit: ALL, home: '/', note: 'Top level – full access to everything' },
  'Manager':    { view: ALL, edit: ALL, home: '/', note: 'Runs daily work – full access' },
  'Supervisor': { view: FARM, edit: ['/cows', '/milk', '/diary', '/weather', '/production', '/feed-stock'], home: '/', note: 'Own sheds – farm work' },
  'Vet Doctor': { view: ['/', '/reports', '/cows', '/health', '/feed', '/weather'], edit: ['/health', '/feed'], home: '/health', note: 'Health of cows' },
  'Worker':     { view: ['/cows', '/milk'], edit: [], home: '/cows', note: 'Can see cows, their feeding status and milk production' }
};
export const ROLE_ORDER = ['Director', 'Manager', 'Supervisor', 'Vet Doctor', 'Worker'];

// '/cows/COW-101' → '/cows'
const base = (path) => '/' + (path.split('/')[1] || '');
export const canView = (role, path) => (ACCESS[role] || ACCESS.Worker).view.includes(base(path));
export const canEdit = (role, path) => (ACCESS[role] || ACCESS.Worker).edit.includes(base(path));
