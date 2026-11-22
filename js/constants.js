'use strict';
/* =========================== 1. CONSTANTS =========================== */
const CFG = window.HOMEHUB_CONFIG || {};
const ALLOWED_EMAILS = (CFG.allowedEmails || []).map(e => String(e).trim().toLowerCase());
const HOUSEHOLD_ID_RE = /^[A-Za-z0-9_-]{6,64}$/;
const STORE_KEY  = 'homehub.data.v1';
const CLIENT_KEY = 'homehub.clientId';
const CLIENT_ID  = localStorage.getItem(CLIENT_KEY) || (() => {
  const id = 'c_' + Math.random().toString(36).slice(2, 10);
  localStorage.setItem(CLIENT_KEY, id);
  return id;
})();

const NAV = [
  { id: 'dashboard', label: 'Home',      icon: 'house' },
  { id: 'tasks',     label: 'Tasks',     icon: 'list-checks' },
  { id: 'birthdays', label: 'Birthdays', icon: 'cake' },
  { id: 'christmas', label: 'Christmas', icon: 'tree-pine' },
  { id: 'vault',     label: 'Vault',     icon: 'shield-check' },
  { id: 'settings',  label: 'Settings',  icon: 'settings', desktopOnly: true }
];
const TITLES = { dashboard: 'Home', tasks: 'Tasks & Checklists', birthdays: 'Birthdays', christmas: 'Christmas Planner', vault: 'Household Vault', settings: 'Settings', tools: 'Other tools', finance: 'Finance planner' };

const PRIORITIES = {
  high:   { label: 'High',   cls: 'bg-rose-50 text-rose-700 ring-rose-200',    rank: 0 },
  medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-700 ring-amber-200', rank: 1 },
  low:    { label: 'Low',    cls: 'bg-sky-50 text-sky-700 ring-sky-200',       rank: 2 }
};
const TASK_CATS = { general: 'General', household: 'Household', errands: 'Errands' };

const GIFT_STATUS = [
  { id: 'idea',    label: 'Idea only',       icon: 'lightbulb' },
  { id: 'ordered', label: 'Ordered',         icon: 'package' },
  { id: 'ready',   label: 'Wrapped / Ready', icon: 'gift' }
];

const XMAS_STATUS = [
  { id: 'notstarted', label: 'Not started', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
  { id: 'idea',       label: 'Idea',        cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  { id: 'purchased',  label: 'Purchased',   cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { id: 'delivered',  label: 'Delivered',   cls: 'bg-violet-50 text-violet-700 ring-violet-200' },
  { id: 'wrapped',    label: 'Wrapped',     cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
];
const XMAS_IDX = Object.fromEntries(XMAS_STATUS.map((s, i) => [s.id, i]));
const XMAS_BOUGHT_IDX = XMAS_IDX.purchased; // purchased or beyond counts as "spent"

/* ---- Category colours & icons (full Tailwind class names so the CDN generates them) ---- */
const COLOURS = {
  teal:    { bg: 'bg-teal-50',    fg: 'text-teal-600',    dot: 'bg-teal-500' },
  emerald: { bg: 'bg-emerald-50', fg: 'text-emerald-600', dot: 'bg-emerald-500' },
  sky:     { bg: 'bg-sky-50',     fg: 'text-sky-600',     dot: 'bg-sky-500' },
  indigo:  { bg: 'bg-indigo-50',  fg: 'text-indigo-600',  dot: 'bg-indigo-500' },
  violet:  { bg: 'bg-violet-50',  fg: 'text-violet-600',  dot: 'bg-violet-500' },
  fuchsia: { bg: 'bg-fuchsia-50', fg: 'text-fuchsia-600', dot: 'bg-fuchsia-500' },
  rose:    { bg: 'bg-rose-50',    fg: 'text-rose-600',    dot: 'bg-rose-500' },
  orange:  { bg: 'bg-orange-50',  fg: 'text-orange-600',  dot: 'bg-orange-500' },
  amber:   { bg: 'bg-amber-50',   fg: 'text-amber-600',   dot: 'bg-amber-500' },
  lime:    { bg: 'bg-lime-50',    fg: 'text-lime-700',    dot: 'bg-lime-500' },
  cyan:    { bg: 'bg-cyan-50',    fg: 'text-cyan-600',    dot: 'bg-cyan-500' },
  slate:   { bg: 'bg-slate-100',  fg: 'text-slate-600',   dot: 'bg-slate-500' }
};
const CAT_ICONS = ['landmark', 'house', 'car', 'heart-pulse', 'wifi', 'piggy-bank', 'folder', 'zap', 'flame', 'droplets', 'phone', 'tv',
  'shield', 'briefcase', 'graduation-cap', 'plane', 'dog', 'baby', 'stethoscope', 'receipt', 'credit-card', 'wallet', 'file-text', 'key-round',
  'building-2', 'bike', 'gem', 'umbrella', 'wrench', 'sprout', 'laptop', 'gift'];

/* ---- Household Vault categories: these are only the starting set – users can edit them (state.vaultCats) ---- */
const DEFAULT_VAULT_CATS = [
  { id: 'mortgage',    label: 'Mortgages',               icon: 'landmark',    colour: 'indigo' },
  { id: 'home',        label: 'Home Insurance',          icon: 'house',       colour: 'teal' },
  { id: 'car',         label: 'Car Insurance',           icon: 'car',         colour: 'sky' },
  { id: 'life',        label: 'Life / Health Insurance', icon: 'heart-pulse', colour: 'rose' },
  { id: 'utilities',   label: 'Utilities / Broadband',   icon: 'wifi',        colour: 'amber' },
  { id: 'investments', label: 'Investments / Savings',   icon: 'piggy-bank',  colour: 'emerald' },
  { id: 'other',       label: 'Other',                   icon: 'folder',      colour: 'slate' }   // 'other' is permanent (fallback)
];
function vcats() { return (state && Array.isArray(state.vaultCats) && state.vaultCats.length) ? state.vaultCats : DEFAULT_VAULT_CATS; }
/** Category lookup with colour classes; unknown/deleted ids fall back to "Other". */
function vcat(id) {
  const L = vcats();
  const c = L.find(x => x.id === id) || L.find(x => x.id === 'other') || DEFAULT_VAULT_CATS[DEFAULT_VAULT_CATS.length - 1];
  return { ...c, ...(COLOURS[c.colour] || COLOURS.slate) };
}

/* ---- Finance planner ---- */
const FIN_FREQ  = { monthly: 'Monthly', yearly: 'Yearly' };
const FIN_TYPES = { essential: 'Essential', discretionary: 'Discretionary' };
function defaultFinance() {
  return {
    incomeCats: [
      { id: 'salary', label: 'Salary' },
      { id: 'bonus', label: 'Bonus / overtime' },
      { id: 'benefits', label: 'Benefits' },
      { id: 'inc_other', label: 'Other income' }            // permanent fallback
    ],
    outCats: [
      { id: 'housing', label: 'Housing', essential: true },
      { id: 'utilities', label: 'Utilities & broadband', essential: true },
      { id: 'insurance', label: 'Insurance', essential: true },
      { id: 'transport', label: 'Transport', essential: true },
      { id: 'food', label: 'Food & groceries', essential: true },
      { id: 'childcare', label: 'Childcare', essential: true },
      { id: 'debt', label: 'Debt & credit', essential: true },
      { id: 'subscriptions', label: 'Subscriptions', essential: false },
      { id: 'leisure', label: 'Leisure & eating out', essential: false },
      { id: 'gifts', label: 'Gifts & occasions', essential: false },
      { id: 'out_other', label: 'Other', essential: false }   // permanent fallback
    ],
    incomes: [],     // { id, name, amount, frequency: monthly|yearly, categoryId, notes }
    outgoings: [],   // { id, name, amount, frequency, categoryId, type: essential|discretionary, dueDate, notes }
    pots: [],        // { id, name, mode: fixed|percent, value, target, balance, targetDate, notes }
    billsPot: { name: 'Annual bills pot (Monzo)', balance: 0 },
    csvProfiles: {}  // remembered column mappings per CSV layout (no transaction data)
  };
}

/* ---- Other tools registry – add future tools here (and to TITLES / VIEWS) ---- */
const TOOLS = [
  { route: 'finance', title: 'Finance planner', icon: 'wallet', tone: 'bg-emerald-50 text-emerald-600',
    desc: 'Joint take-home budget, regular outgoings, annual bills pot and savings allocation – with a bank CSV regular-payment finder.',
    status: () => { const s = finStats(); return s.income ? `Left to spend: ${money(s.left)} a month` : 'Not set up yet'; } }
];

