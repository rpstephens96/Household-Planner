'use strict';
/* ===================== 7b. BANK CSV – REGULAR PAYMENT FINDER =====================
   Statement files are parsed in memory only (csvSession). Nothing from them is
   persisted or synced – only the items the user confirms are added to the budget. */
let csvSession = null;
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function parseCSVText(text) {
  text = String(text).replace(/^\uFEFF/, '');
  const sample = text.slice(0, 3000);
  const delim = [',', ';', '\t'].map(d => [d, sample.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.map(r => r.map(x => x.replace(/\u00a0/g, ' ').trim())).filter(r => r.some(x => x !== ''));
}
/** Santander "Download transactions" text format: Date: / Description: / Amount: / Balance: blocks. */
function parseSantanderTxt(text) {
  const rows = [['Date', 'Description', 'Amount']]; let cur = null;
  String(text).replace(/\u00a0/g, ' ').split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*(Date|Description|Amount)\s*:\s*(.*)$/i); if (!m) return;
    const k = m[1].toLowerCase();
    if (k === 'date') { if (cur) rows.push(cur); cur = [m[2].trim(), '', '']; }
    else if (cur) cur[k === 'description' ? 1 : 2] = m[2].replace(/\s*GBP\s*$/i, '').trim();
  });
  if (cur) rows.push(cur);
  return rows;
}
/** UK-first date parsing: dd/mm/yyyy, dd-mm-yy, yyyy-mm-dd, 12 Oct 2025, 12-Oct-25. */
function parseDateAny(s) {
  s = String(s || '').trim(); let m;
  const mk = (y, mo, d) => { y = Number(y); if (y < 100) y += 2000; mo = Number(mo); d = Number(d); if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y > 1990 && y < 2200)) return null; return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0'); };
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return mk(m[1], m[2], m[3]);
  if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/))) return mk(m[3], m[2], m[1]);
  if ((m = s.match(/^(\d{1,2})[\s\-]([A-Za-z]{3})[A-Za-z]*[\s\-,]+(\d{2,4})\b/))) { const mo = MONTHS[m[2].toLowerCase()]; return mo ? mk(m[3], mo, m[1]) : null; }
  return null;
}
function parseAmountAny(s) {
  s = String(s ?? '').trim(); if (!s) return null;
  const neg = /^\(.*\)$/.test(s) || /\bDR\b/i.test(s) || /-/.test(s);
  const digits = s.replace(/[^0-9.]/g, '');
  if (!digits || !/\d/.test(digits)) return null;
  const n = parseFloat(digits);
  if (!isFinite(n)) return null;
  return neg ? -n : n;
}
const isAmountCell = x => /^[-+(]?\s*[£$€]?\s*[-+]?[\d,]+(\.\d+)?\)?(\s*(CR|DR|GBP))?$/i.test(String(x || '').trim());
/** Reduce a bank description to a stable payee key, e.g. "DIRECT DEBIT PAYMENT TO OCTOPUS ENERGY REF 123" → "octopus energy". */
function payeeKey(s, words) {
  let t = String(s || '').toLowerCase();
  t = t.replace(/,?\s*\b(ref(erence)?|mandate( no)?|on \d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|via)\b.*$/, ' ');
  t = t.replace(/\b(direct debit|standing order|faster payments?|bill payment|card payment|contactless|payment|paid|received|from|to|dd|so|bgc|bp|vis|visa|pos|cr|dr|fpi|fpo|tfr|chq|atm|ddr|d\/d|s\/o|ltd|limited|plc|uk|gb|london|www|com)\b/g, ' ');
  t = t.replace(/\b[a-z]*\d[a-z\d]*\b/g, ' ');            // reference codes such as P1234ABC
  t = t.replace(/[^a-z&]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t.split(' ').filter(w => w.length > 1 || w === '&').slice(0, words || 3).join(' ');
}
const titleCase = s => String(s).toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase());

function detectLayout(rows) {
  let hi = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const r = rows[i].map(x => x.toLowerCase());
    if (r.some(x => /date/.test(x)) && r.some(x => /amount|money|paid|debit|credit|value|balance/.test(x)) && !parseDateAny(rows[i][0])) { hi = i; break; }
  }
  if (hi === -1) {   // no header row (typical HSBC export: Date, Description, Amount[, Balance])
    const first = Math.max(0, rows.findIndex(r => parseDateAny(r[0])));
    const sample = rows.slice(first, first + 15);
    const ncol = Math.max(0, ...sample.map(r => r.length));
    const numeric = c => sample.filter(r => r[c]).length > 0 && sample.filter(r => r[c]).every(r => isAmountCell(r[c]));
    let desc = -1, amount = -1;
    for (let c = 1; c < ncol; c++) { if (desc < 0 && !numeric(c)) desc = c; else if (desc >= 0 && amount < 0 && numeric(c)) amount = c; }
    if (amount < 0) for (let c = 1; c < ncol; c++) if (numeric(c)) { amount = c; break; }
    return { start: first, header: Array.from({ length: ncol }, (_, i) => 'Column ' + (i + 1)), map: { date: 0, desc, amount, in: -1, out: -1, type: -1, cat: -1, flip: false }, bank: ncol <= 4 ? 'HSBC / no header' : 'CSV (no header)', headerless: true };
  }
  const h = rows[hi].map(x => x.toLowerCase().trim());
  const find = (...res) => { for (const re of res) { const i = h.findIndex(x => re.test(x)); if (i >= 0) return i; } return -1; };
  const map = {
    date: find(/^date$/, /^transaction date$/, /^posted/, /date/),
    desc: find(/^name$/, /^description$/, /payee/, /merchant/, /narrative/, /details/, /description/, /^reference$/, /memo/),
    amount: find(/^amount$/, /^value$/, /^amount \(gbp\)$/, /^amount(?!.*local)/),
    in: find(/money in/, /paid in/, /^credit/, /^in$/, /credit amount/),
    out: find(/money out/, /paid out/, /^debit/, /^out$/, /debit amount/),
    type: find(/^type$/, /transaction type/),
    cat: find(/^category$/),
    flip: false
  };
  if (map.amount >= 0) { map.in = -1; map.out = -1; }
  const bank = (h.includes('emoji') || (h.includes('transaction id') && h.includes('name'))) ? 'Monzo'
    : (map.in >= 0 && map.out >= 0) ? 'Santander / money in–out CSV' : 'Bank CSV';
  return { start: hi + 1, header: rows[hi], map, bank, headerless: false };
}
function buildTxns(f) {
  const m = f.map, out = [];
  const col = (r, i) => (i >= 0 && i < r.length) ? r[i] : '';
  for (let i = f.start; i < f.rows.length; i++) {
    const r = f.rows[i];
    const date = parseDateAny(col(r, m.date)); if (!date) continue;
    let amt;
    if (m.amount >= 0) amt = parseAmountAny(col(r, m.amount));
    else {
      const a = parseAmountAny(col(r, m.in)), b = parseAmountAny(col(r, m.out));
      if (a === null && b === null) continue;
      amt = (a ? Math.abs(a) : 0) - (b ? Math.abs(b) : 0);
    }
    if (amt === null || !amt) continue;
    if (m.flip) amt = -amt;
    out.push({ date, amount: amt, desc: String(col(r, m.desc)).trim(), type: String(col(r, m.type)), cat: String(col(r, m.cat)), account: f.label });
  }
  f.txns = out;
  return out;
}

const OUT_RULES = [
  [/mortgage|\brent\b|council tax|ground rent|service charge|lettings|housing assoc/, 'housing'],
  [/octopus|british gas|\bedf\b|e\.?on|\bovo\b|scottish power|so energy|utility warehouse|water|thames|severn|anglian|united utilities|\bbt\b|sky digital|\bsky\b|virgin media|plusnet|talktalk|vodafone|\bee\b|\bo2\b|three|giffgaff|tv licen|hyperoptic|community fibre|energy/, 'utilities'],
  [/insurance|insure|aviva|admiral|direct line|legal (&|and) general|\bl ?& ?g\b|\blv\b|hastings|churchill|\baxa\b|vitality|bupa|zurich|royal london|petplan|esure|policy|assurance/, 'insurance'],
  [/dvla|vehicle tax|\btfl\b|trainline|lner|\brail\b|\bshell\b|\besso\b|texaco|\bfuel|petrol|parking|ringgo|paybyphone|car finance|\bpcp\b|\buber\b(?!.*eats)/, 'transport'],
  [/tesco|sainsbury|asda|aldi|lidl|morrisons|ocado|waitrose|co-?op|iceland|m ?& ?s|marks|farmfoods|grocer/, 'food'],
  [/nursery|childcare|childminder|school|tax-?free childcare|after school/, 'childcare'],
  [/\bloan\b|credit card|amex|american express|barclaycard|capital one|mbna|klarna|clearpay|paypal credit|zopa|novuna|finance/, 'debt'],
  [/netflix|spotify|disney|prime|apple|icloud|google|youtube|audible|now ?tv|xbox|playstation|nintendo|patreon|microsoft|adobe|dropbox|openai|chatgpt|subscription/, 'subscriptions'],
  [/\bgym\b|puregym|the gym|david lloyd|nuffield|restaurant|deliveroo|just eat|uber eats|cinema|odeon|cineworld|\bpub\b|costa|starbucks|greggs/, 'leisure']
];
const MONZO_CATS = { bills: 'utilities', groceries: 'food', transport: 'transport', entertainment: 'leisure', eating_out: 'leisure', 'eating out': 'leisure', holidays: 'leisure', family: 'childcare', finances: 'debt', gifts: 'gifts' };
function guessFinCat(dir, text, mcat) {
  const F = fin(), t = String(text).toLowerCase();
  const has = (L, id) => L.some(c => c.id === id);
  if (dir === 'in') {
    if (/child benefit|universal credit|tax credit/.test(t) && has(F.incomeCats, 'benefits')) return 'benefits';
    if (/salary|wages|payroll|\bpay\b/.test(t) && has(F.incomeCats, 'salary')) return 'salary';
    return 'inc_other';
  }
  for (const [re, id] of OUT_RULES) if (re.test(t) && has(F.outCats, id)) return id;
  const mc = MONZO_CATS[String(mcat || '').toLowerCase()];
  if (mc && has(F.outCats, mc)) return mc;
  return 'out_other';
}
function classifyInterval(d) {
  if (d >= 5 && d <= 9) return { freq: 'monthly', mult: 52 / 12, label: 'weekly', tol: [5, 9] };
  if (d >= 12 && d <= 17) return { freq: 'monthly', mult: 26 / 12, label: 'fortnightly', tol: [11, 18] };
  if (d >= 24 && d <= 36) return { freq: 'monthly', mult: 1, label: 'monthly', tol: [20, 40] };
  if (d >= 80 && d <= 100) return { freq: 'yearly', mult: 4, label: 'quarterly', tol: [75, 105] };
  if (d >= 170 && d <= 200) return { freq: 'yearly', mult: 2, label: 'six-monthly', tol: [160, 210] };
  if (d >= 340 && d <= 390) return { freq: 'yearly', mult: 1, label: 'yearly', tol: [330, 400] };
  return null;
}
const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
const dayDiff = (a, b) => Math.round((parseYMD(b) - parseYMD(a)) / 864e5);
function bestName(list, key) {
  const counts = {};
  list.forEach(t => { const d = t.desc.replace(/\s+/g, ' ').trim(); if (d) counts[d] = (counts[d] || 0) + 1; });
  const top = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [''])[0];
  if (top && top !== top.toUpperCase() && top.length <= 32 && !/\d{4,}/.test(top)) return top;   // tidy mixed-case names (e.g. Monzo)
  return titleCase(payeeKey(top, 5) || key);                                                       // clean up BANK STYLE TEXT
}

/** Group transactions by payee + direction + account, then look for a repeating interval and steady amount. */
function analyseCsv() {
  const S = csvSession; if (!S) return;
  S.files.forEach(f => { if (!f.error) buildTxns(f); });
  const all = S.files.flatMap(f => f.txns || []);
  S.txCount = all.length; S.sugs = [];
  if (!all.length) return;
  const dates = all.map(t => t.date).sort();
  S.from = dates[0]; S.to = dates[dates.length - 1];
  const span = Math.max(1, dayDiff(S.from, S.to));
  const groups = new Map();
  all.forEach(t => {
    if (/pot transfer|flex/i.test(t.type)) return;          // Monzo pot moves are never bills
    const dir = t.amount < 0 ? 'out' : 'in';
    const key = payeeKey(t.desc); if (!key) return;
    const k = dir + '|' + key + '|' + t.account;
    if (!groups.has(k)) groups.set(k, { dir, key, account: t.account, list: [] });
    groups.get(k).list.push(t);
  });
  const keyMatch = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a)));
  const existingOut = finOutgoings().map(o => payeeKey(o.name)).filter(Boolean);
  const existingIn = fin().incomes.map(o => payeeKey(o.name)).filter(Boolean);
  groups.forEach(g => {
    const list = g.list.sort((a, b) => a.date < b.date ? -1 : 1);
    const amts = list.map(t => Math.abs(t.amount));
    const udates = [...new Set(list.map(t => t.date))];
    const intervals = udates.slice(1).map((d, i) => dayDiff(udates[i], d));
    const last = udates[udates.length - 1];
    const text = list.map(t => t.desc + ' ' + t.type).join(' ');
    const isMandate = /direct debit|standing order|\bdd\b|\bso\b|d\/d|s\/o/i.test(text);
    const isTransfer = /\b(transfer|tfr|pot|savings?|isa|own account|monzo|santander|hsbc|round ?ups?)\b/i.test(list[0].desc);
    const mean = amts.reduce((a, b) => a + b, 0) / amts.length;
    const cv = mean ? Math.sqrt(amts.reduce((a, b) => a + (b - mean) ** 2, 0) / amts.length) / mean : 0;
    const baseAmt = median(amts.slice(-3));
    let s = null;
    if (udates.length >= 2) {
      const med = median(intervals), cls = classifyInterval(med);
      if (cls) {
        const regular = intervals.filter(d => d >= cls.tol[0] && d <= cls.tol[1]).length / intervals.length;
        if (regular >= 0.5) {
          let conf = ((udates.length >= 3 && regular >= 0.8 && cv < 0.2) || (isMandate && regular >= 0.8)) ? 'high' : regular >= 0.65 ? 'medium' : 'low';
          const stopped = dayDiff(last, S.to) > med * 1.6 + 7;
          if (stopped) conf = 'low';
          s = { kind: 'regular', freq: cls.freq, amount: baseAmt * cls.mult, intervalLabel: cls.label, interval: Math.round(med), conf, stopped };
        }
      }
      if (!s && g.dir === 'out' && list.length >= 4 && span >= 45) {
        s = { kind: 'variable', freq: 'monthly', amount: amts.reduce((a, b) => a + b, 0) / Math.max(1, span / 30.44), intervalLabel: 'varies', conf: 'low' };
      }
    } else if (g.dir === 'out' && isMandate) {
      s = { kind: 'once', freq: 'yearly', amount: amts[0], intervalLabel: 'seen once', conf: 'low' };
    }
    if (!s) return;
    Object.assign(s, { dir: g.dir, key: g.key, account: g.account, name: bestName(list, g.key), count: list.length, first: udates[0], last,
      min: Math.min(...amts), max: Math.max(...amts), mandate: isMandate, transfer: isTransfer });
    const mcat = (list.find(t => t.cat) || {}).cat || '';
    s.categoryId = g.dir === 'in'
      ? (s.freq === 'monthly' && s.amount >= 500 && fin().incomeCats.some(c => c.id === 'salary') && !isTransfer ? 'salary' : guessFinCat('in', text, mcat))
      : guessFinCat('out', text, mcat);
    s.type = g.dir === 'out' ? ((fin().outCats.find(c => c.id === s.categoryId) || {}).essential === false ? 'discretionary' : 'essential') : '';
    s.tracked = (g.dir === 'out' ? existingOut : existingIn).some(k => keyMatch(k, g.key));
    if (g.dir === 'out') {
      const words = g.key.split(' ');
      const v = state.vault.find(v => { const pw = payeeKey(v.provider).split(' ')[0]; return pw && pw.length >= 3 && words.includes(pw); });
      if (v) { if (v.inBudget) s.tracked = true; else { s.vaultId = v.id; s.vaultName = v.provider + (v.name ? ' – ' + v.name : ''); } }
    }
    s.checked = !s.tracked && !s.transfer && s.kind === 'regular' && s.conf !== 'low';
    S.sugs.push(s);
  });
  const rank = { high: 0, medium: 1, low: 2 }, kr = { regular: 0, once: 1, variable: 2 };
  S.sugs.sort((a, b) => (a.dir === b.dir ? 0 : a.dir === 'in' ? -1 : 1) || kr[a.kind] - kr[b.kind] || rank[a.conf] - rank[b.conf] || b.amount - a.amount);
}

async function loadCsvFiles(fileList) {
  const files = Array.from(fileList || []); if (!files.length) return;
  const read = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error || new Error('read failed')); r.readAsText(f); });
  if (!csvSession) csvSession = { files: [], sugs: [] };
  for (const file of files) {
    const entry = { name: file.name };
    try {
      const text = await read(file);
      if (/^\s*Date\s*:/mi.test(text) && /^\s*Amount\s*:/mi.test(text)) {
        const rows = parseSantanderTxt(text);
        Object.assign(entry, { rows, start: 1, header: rows[0], map: { date: 0, desc: 1, amount: 2, in: -1, out: -1, type: -1, cat: -1, flip: false }, bank: 'Santander', headerless: false, sig: 'santander-txt' });
      } else {
        const rows = parseCSVText(text);
        if (!rows.length) throw new Error('the file is empty');
        Object.assign(entry, { rows }, detectLayout(rows));
        entry.sig = entry.headerless ? 'headerless:' + entry.header.length : entry.header.map(x => x.toLowerCase()).join('|');
        const saved = fin().csvProfiles[entry.sig];
        if (saved) entry.map = Object.assign({}, entry.map, saved);
      }
      const base = entry.bank.split(/[ /]/)[0];
      const same = csvSession.files.filter(f => f.label && f.label.startsWith(base)).length;
      entry.label = same ? `${base} ${same + 1}` : base;
    } catch (e) {
      entry.error = 'Could not read this file: ' + (e.message || e);
      entry.label = file.name;
    }
    csvSession.files.push(entry);
  }
  if (!appBooted || !csvSession) return;   // signed out while reading
  analyseCsv();
  render();
}

