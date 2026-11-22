'use strict';
/* ===================== 3. STATE: DEFAULTS & STORAGE ==================== */
function defaultState() {
  return {
    version: 1,
    tasks: [],
    checklists: [],
    people: [],
    christmas: { year: new Date().getFullYear(), budget: 0, recipients: [], archive: [] },
    vault: [],
    vaultCats: clone(DEFAULT_VAULT_CATS),
    finance: defaultFinance(),
    settings: { sync: { enabled: false, householdId: '', lastSync: null } },
    meta: { updatedAt: Date.now(), updatedBy: CLIENT_ID }
  };
}

/** Realistic sample data, with dates relative to "today" so every feature is testable immediately. */
function sampleState() {
  const s = defaultState();
  const t = todayStr();
  const y = new Date().getFullYear();
  const S = { sample: true };
  // DOB such that the next birthday is `offset` days away and they are turning `age`
  const dobFor = (offset, age) => { const d = addDays(t, offset); return (Number(d.slice(0, 4)) - age) + d.slice(4); };

  s.tasks = [
    { id: uid(), title: 'Book MOT for the Golf', due: t, priority: 'high', category: 'errands', notes: 'Kwik Fit or the garage on the high street', done: false, ...S },
    { id: uid(), title: 'Renew TV licence', due: addDays(t, -2), priority: 'medium', category: 'household', notes: '', done: false, ...S },
    { id: uid(), title: 'Clear the gutters before winter', due: addDays(t, 5), priority: 'low', category: 'household', notes: '', done: false, ...S },
    { id: uid(), title: 'Return parcel to Amazon locker', due: '', priority: 'medium', category: 'errands', notes: '', done: true, ...S }
  ];

  const items = arr => arr.map(([text, done]) => ({ id: uid(), text, done: !!done }));
  s.checklists = [
    { id: uid(), title: 'Holiday Packing', reusable: true, ...S, items: items([['Passports (check expiry!)', 1], ['GHIC cards', 1], ['Travel insurance documents', 0], ['Plug adaptors', 0], ['Suncream', 0], ['Phone chargers & power bank', 0]]) },
    { id: uid(), title: 'Weekly Food Shop', reusable: true, ...S, items: items([['Milk', 0], ['Bread', 0], ['Eggs', 1], ['Bananas', 0], ['Chicken thighs', 0], ['Pasta', 0]]) },
    { id: uid(), title: 'Spare room redecoration', reusable: false, ...S, items: items([['Choose paint colour', 1], ['Buy paint & rollers', 1], ['Fill holes & sand', 0], ['Paint ceiling', 0], ['Paint walls', 0]]) }
  ];

  const mumId = uid(), jamesId = uid(), sophieId = uid();
  const idea = (title, price, link) => ({ id: uid(), title, price, link: link || '' });
  const mumIdeas = [idea('Afternoon tea for two voucher', 45, 'https://www.virginexperiencedays.co.uk'), idea('Cashmere scarf', 60, 'https://www.johnlewis.com')];
  s.people = [
    { id: mumId, name: 'Margaret (Mum)', relationship: 'Mother', dob: dobFor(9, 64), yearKnown: true, notes: 'Loves gardening and Agatha Christie', ...S,
      ideas: mumIdeas, finalGift: { title: mumIdeas[0].title, price: 45, status: 'ordered', ideaId: mumIdeas[0].id },
      cardBought: true, cardSent: false,
      history: [
        { id: uid(), year: y - 1, occasion: 'Birthday', gift: 'Garden kneeler & gloves set', price: 25, notes: '' },
        { id: uid(), year: y - 1, occasion: 'Christmas', gift: 'Jo Malone candle', price: 55, notes: 'She loved it' }
      ] },
    { id: jamesId, name: 'James Carter', relationship: 'Brother', dob: dobFor(24, 31), yearKnown: true, notes: '', ...S,
      ideas: [idea('Lego Technic set', 90, 'https://www.lego.com/en-gb'), idea('Craft beer subscription', 30, '')],
      finalGift: null, cardBought: false, cardSent: false,
      history: [{ id: uid(), year: y - 1, occasion: 'Birthday', gift: 'Football shirt', price: 70, notes: '' }] },
    { id: sophieId, name: 'Sophie (niece)', relationship: 'Niece', dob: dobFor(75, 8), yearKnown: true, notes: 'Into horses and drawing', ...S,
      ideas: [idea('Art set with easel', 35, '')],
      finalGift: { title: 'Art set with easel', price: 35, status: 'ready', ideaId: null },
      cardBought: true, cardSent: false, history: [] }
  ];
  s.people.forEach(p => { p.cycleFor = nextBirthday(p).date; });

  s.christmas = {
    year: y, budget: 800, archive: [], sampleBudget: true,
    recipients: [
      { id: uid(), name: 'Margaret (Mum)', personId: mumId, budget: 100, notes: '', ...S, gifts: [
        { id: uid(), title: 'Personalised photo book', price: 40, status: 'purchased', link: '' },
        { id: uid(), title: 'Box of Thorntons', price: 12, status: 'idea', link: '' }] },
      { id: uid(), name: 'James Carter', personId: jamesId, budget: 60, notes: '', ...S, gifts: [
        { id: uid(), title: 'Whisky tasting set', price: 45, status: 'wrapped', link: '' }] },
      { id: uid(), name: 'Mrs Patel (Sophie\'s teacher)', personId: null, budget: 15, notes: 'Christmas-only recipient', ...S, gifts: [
        { id: uid(), title: 'Candle & thank-you card', price: 12, status: 'notstarted', link: '' }] },
      { id: uid(), name: 'Secret Santa (work)', personId: null, budget: 10, notes: '£10 limit', ...S, gifts: [
        { id: uid(), title: 'Desk plant', price: 10, status: 'delivered', link: '' }] }
    ]
  };

  s.vault = [
    { id: uid(), category: 'mortgage', name: 'Main residential mortgage', provider: 'Nationwide', accountNo: 'NW-4458-2219', renewalDate: addDays(t, 210), cost: 1150, costPeriod: 'monthly', autoRenew: false,
      location: 'Blue folder in study filing cabinet – "Mortgage" divider', url: 'https://www.nationwide.co.uk', notes: '5-year fix at 4.29%. Reverts to SVR after end date – speak to broker 6 months before.', ...S },
    { id: uid(), category: 'home', name: 'Buildings & contents', provider: 'Aviva', accountNo: 'AV-HH-99321', renewalDate: addDays(t, 40), cost: 420, costPeriod: 'annual', autoRenew: true,
      location: 'Joint Gmail – search "Aviva"', url: 'https://www.aviva.co.uk/myaviva', notes: 'Excess: £100 compulsory + £250 voluntary. Accidental damage included.', ...S },
    { id: uid(), category: 'car', name: 'VW Golf – comprehensive', provider: 'Admiral', accountNo: 'P12345678', renewalDate: addDays(t, 10), cost: 38, costPeriod: 'monthly', autoRenew: true,
      location: '1Password Shared Vault – "Car insurance" item', url: 'https://www.admiral.com', notes: 'Excess £350. Named drivers: both of us. Check renewal quote vs comparison sites.', ...S },
    { id: uid(), category: 'utilities', name: 'Broadband (fibre 500)', provider: 'BT', accountNo: 'BT-77120044', renewalDate: addDays(t, 120), cost: 42.99, costPeriod: 'monthly', autoRenew: true,
      location: 'Joint Gmail – label "Bills"', url: 'https://www.bt.com/mybt', notes: '30 days\' notice to cancel once out of contract.', ...S },
    { id: uid(), category: 'life', name: 'Joint term life cover', provider: 'Legal & General', accountNo: 'LG-889023', renewalDate: '', cost: 24.5, costPeriod: 'monthly', autoRenew: true,
      location: 'Fireproof box under the stairs', url: 'https://www.legalandgeneral.com', notes: '25-year term, decreasing cover linked to mortgage.', ...S }
  ];
  return s;
}

let state;
let ui = {
  taskFilter: 'open', taskCat: 'all', tasksTab: 'tasks',
  clCollapsed: {}, personOpen: {},
  xmasFilter: 'all', vaultCat: 'all', vaultSearch: '',
  finTab: 'overview', finOutFilter: 'all'
};

/** Fill in any missing keys so older/imported data never crashes the UI. */
function normalise(raw) {
  const d = defaultState();
  const s = Object.assign(d, raw || {});
  s.tasks = Array.isArray(s.tasks) ? s.tasks : [];
  s.checklists = (Array.isArray(s.checklists) ? s.checklists : []).map(c => ({ items: [], ...c, items: Array.isArray(c.items) ? c.items : [] }));
  s.people = (Array.isArray(s.people) ? s.people : []).map(p => ({ ideas: [], history: [], finalGift: null, cardBought: false, cardSent: false, yearKnown: true, ...p,
    ideas: Array.isArray(p.ideas) ? p.ideas : [], history: Array.isArray(p.history) ? p.history : [] }));
  s.christmas = Object.assign({ year: new Date().getFullYear(), budget: 0, recipients: [], archive: [] }, s.christmas || {});
  s.christmas.recipients = (s.christmas.recipients || []).map(r => ({ gifts: [], ...r, gifts: Array.isArray(r.gifts) ? r.gifts : [] }));
  s.vault = Array.isArray(s.vault) ? s.vault : [];
  s.vaultCats = (Array.isArray(s.vaultCats) && s.vaultCats.length ? s.vaultCats : clone(DEFAULT_VAULT_CATS)).filter(c => c && c.id && c.label);
  if (!s.vaultCats.some(c => c.id === 'other')) s.vaultCats.push({ id: 'other', label: 'Other', icon: 'folder', colour: 'slate' });
  const fdef = defaultFinance(), f = Object.assign(defaultFinance(), s.finance || {});
  ['incomes', 'outgoings', 'pots'].forEach(k => { f[k] = Array.isArray(f[k]) ? f[k] : []; });
  ['incomeCats', 'outCats'].forEach(k => { f[k] = Array.isArray(f[k]) && f[k].length ? f[k] : fdef[k]; });
  if (!f.incomeCats.some(c => c.id === 'inc_other')) f.incomeCats.push({ id: 'inc_other', label: 'Other income' });
  if (!f.outCats.some(c => c.id === 'out_other')) f.outCats.push({ id: 'out_other', label: 'Other', essential: false });
  f.billsPot = Object.assign({ name: 'Annual bills pot (Monzo)', balance: 0 }, f.billsPot || {});
  f.csvProfiles = f.csvProfiles && typeof f.csvProfiles === 'object' ? f.csvProfiles : {};
  s.finance = f;
  s.settings = Object.assign(defaultState().settings, s.settings || {});
  const oldSync = s.settings.sync || {};
  s.settings.sync = { enabled: !!oldSync.enabled, householdId: String(oldSync.householdId || ''), lastSync: oldSync.lastSync || null };
  if (oldSync.provider === 'supabase') s.settings.sync.enabled = false;           // Supabase removed – Firebase + Google sign-in only
  if (CFG.defaultHouseholdId && !s.settings.sync.householdId) {                    // optional hard-coded household
    s.settings.sync.householdId = CFG.defaultHouseholdId; s.settings.sync.enabled = true;
  }
  s.meta = Object.assign({ updatedAt: Date.now(), updatedBy: CLIENT_ID }, s.meta || {});
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return normalise(JSON.parse(raw));
  } catch (e) { console.warn('Could not read saved data', e); }
  const s = normalise(sampleState());
  s.meta.updatedAt = 0;   // sample data must never overwrite real data already in the cloud
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
  return s;
}

/** Write to localStorage only (no timestamp bump, no cloud push). */
function persist() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

/** Record a user change: bump timestamp, persist and (if enabled) push to the cloud. */
function save() {
  state.meta.updatedAt = Date.now();
  state.meta.updatedBy = CLIENT_ID;
  try { persist(); } catch (e) { toast('Could not save – storage may be full', 'error'); }
  Sync.schedulePush();
}
function commit() { save(); render(); }

/** The shareable part of state (device-specific sync settings are excluded). */
function exportable() {
  const { settings, ...rest } = state;
  return clone(rest);
}

