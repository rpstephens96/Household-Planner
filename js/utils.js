'use strict';
/* ========================= 2. UTILITY HELPERS ======================== */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const money = n => GBP.format(Number(n) || 0);
const num = v => { const n = parseFloat(String(v ?? '').replace(/[£,\s]/g, '')); return isFinite(n) ? Math.round(n * 100) / 100 : 0; };
const sum = (arr, f) => arr.reduce((t, x) => t + (f ? f(x) : x), 0);
const byId = (arr, id) => arr.find(x => x.id === id);
const touch = o => { if (o) o.updatedAt = Date.now(); return o; };
const clone = o => JSON.parse(JSON.stringify(o));

function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
const todayStr = () => ymd(new Date());
function parseYMD(s) { if (!s) return null; const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(s, n) { const d = parseYMD(s); d.setDate(d.getDate() + n); return ymd(d); }
function daysUntil(s) { if (!s) return null; return Math.round((parseYMD(s) - parseYMD(todayStr())) / 864e5); }
function fmtDate(s, opts) { if (!s) return '—'; return parseYMD(s).toLocaleDateString('en-GB', opts || { day: 'numeric', month: 'short', year: 'numeric' }); }
const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
function relDays(d) {
  if (d === null) return '';
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  return d < 0 ? `${-d} days ago` : `in ${d} days`;
}
function safeUrl(u) {
  u = String(u || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(u)) return 'https://' + u;
  return '';
}
function initials(n) { return String(n || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?'; }
const AVATAR_COLOURS = ['bg-teal-100 text-teal-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700', 'bg-indigo-100 text-indigo-700'];
function avatarCls(name) { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AVATAR_COLOURS[h % AVATAR_COLOURS.length]; }

