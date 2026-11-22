'use strict';
/* ======================== 4. DOMAIN HELPERS ========================== */
function bdayInYear(dob, year) {
  const [, m, d] = dob.split('-').map(Number);
  const day = (m === 2 && d === 29 && !isLeap(year)) ? 28 : d;
  return ymd(new Date(year, m - 1, day));
}
/** Next occurrence (today counts) – returns { date, days, turning } */
function nextBirthday(p) {
  if (!p.dob) return { date: null, days: 9999, turning: null };
  const t = todayStr();
  const y = new Date().getFullYear();
  let date = bdayInYear(p.dob, y);
  if (date < t) date = bdayInYear(p.dob, y + 1);
  const turning = p.yearKnown !== false ? Number(date.slice(0, 4)) - Number(p.dob.slice(0, 4)) : null;
  return { date, days: daysUntil(date), turning };
}

/** Once a birthday has passed, archive the chosen gift and reset card/gift trackers for next year. */
function ensureCycles() {
  let changed = false;
  const t = todayStr();
  state.people.forEach(p => {
    if (!p.dob) return;
    const nb = nextBirthday(p).date;
    if (!p.cycleFor) { p.cycleFor = nb; changed = true; return; }
    if (p.cycleFor < t) {
      if (p.finalGift && p.finalGift.title) {
        p.history.unshift({ id: uid(), year: Number(p.cycleFor.slice(0, 4)), occasion: 'Birthday', gift: p.finalGift.title, price: num(p.finalGift.price), notes: 'Auto-archived after birthday' });
      }
      p.finalGift = null; p.cardBought = false; p.cardSent = false; p.cycleFor = nb;
      touch(p); changed = true;
    }
  });
  if (changed) save();
}

const recipientDone = r => r.gifts.length > 0 && r.gifts.every(g => XMAS_IDX[g.status] >= XMAS_BOUGHT_IDX);
const recipientSpent = r => sum(r.gifts.filter(g => XMAS_IDX[g.status] >= XMAS_BOUGHT_IDX), g => num(g.price));
function xmasStats() {
  const c = state.christmas, R = c.recipients;
  const gifts = R.flatMap(r => r.gifts);
  const spent = sum(gifts.filter(g => XMAS_IDX[g.status] >= XMAS_BOUGHT_IDX), g => num(g.price));
  return {
    budget: num(c.budget), spent,
    planned: sum(gifts, g => num(g.price)),
    budgeted: sum(R, r => num(r.budget)),
    remaining: num(c.budget) - spent,
    done: R.filter(recipientDone).length, total: R.length,
    giftsTotal: gifts.length, giftsBought: gifts.filter(g => XMAS_IDX[g.status] >= XMAS_BOUGHT_IDX).length,
    days: daysUntil(`${c.year}-12-25`)
  };
}


/* ---------- Finance calculations ---------- */
const fin = () => state.finance;
const monthlyOf = x => x.frequency === 'yearly' ? num(x.amount) / 12 : num(x.amount);
function finCat(kind, id) {
  const L = kind === 'income' ? fin().incomeCats : fin().outCats;
  const fb = kind === 'income' ? 'inc_other' : 'out_other';
  return L.find(c => c.id === id) || L.find(c => c.id === fb) || { id: fb, label: 'Other' };
}
const VAULT_TO_FIN = { mortgage: 'housing', home: 'insurance', car: 'insurance', life: 'insurance', utilities: 'utilities' };
function vaultFinCat(v) {
  const c = v.finCat || VAULT_TO_FIN[v.category] || 'out_other';
  return fin().outCats.some(x => x.id === c) ? c : 'out_other';
}
/** Manual outgoings plus vault entries ticked "Include in budget" (the vault stays the single source of truth for those). */
function finOutgoings() {
  const manual = fin().outgoings.map(o => ({ ...o, src: 'manual' }));
  const vault = state.vault.filter(v => v.inBudget && num(v.cost) > 0).map(v => ({
    id: 'v_' + v.id, vaultId: v.id, src: 'vault',
    name: v.provider + (v.name ? ' – ' + v.name : ''),
    amount: num(v.cost), frequency: v.costPeriod === 'annual' ? 'yearly' : 'monthly',
    categoryId: vaultFinCat(v), type: v.finType === 'discretionary' ? 'discretionary' : 'essential',
    dueDate: v.renewalDate || '', notes: ''
  }));
  return [...manual, ...vault];
}
/** Next anniversary of a date (today counts). Future dates are returned unchanged. */
function nextAnnual(s) {
  if (!s) return null;
  const t = todayStr();
  if (s >= t) return s;
  const y = new Date().getFullYear();
  let d = bdayInYear(s, y);
  if (d < t) d = bdayInYear(s, y + 1);
  return d;
}
/** Income → monthly outgoings → annual bills pot (yearly ÷ 12) → savings → left to spend. */
function finStats() {
  const F = fin(), outs = finOutgoings();
  const income = sum(F.incomes, monthlyOf);
  const monthlyItems = outs.filter(o => o.frequency !== 'yearly');
  const yearlyItems = outs.filter(o => o.frequency === 'yearly');
  const monthlyOut = sum(monthlyItems, o => num(o.amount));
  const yearlyTotal = sum(yearlyItems, o => num(o.amount));
  const billsPot = yearlyTotal / 12;
  const essential = sum(outs.filter(o => o.type !== 'discretionary'), monthlyOf);
  const discretionary = sum(outs.filter(o => o.type === 'discretionary'), monthlyOf);
  const available = income - monthlyOut - billsPot;
  const potAlloc = F.pots.map(p => ({ p, monthly: p.mode === 'percent' ? Math.max(0, available) * num(p.value) / 100 : num(p.value) }));
  const savings = sum(potAlloc, x => x.monthly);
  const byCat = {};
  outs.forEach(o => { const c = finCat('out', o.categoryId).id; byCat[c] = (byCat[c] || 0) + monthlyOf(o); });
  return { income, outs, monthlyItems, yearlyItems, monthlyOut, yearlyTotal, billsPot, essential, discretionary, available, potAlloc, savings, left: available - savings, byCat };
}
/** What the annual bills pot should hold today: each yearly bill needs (12 − months until due) / 12 of its cost saved. */
function billsPotStatus() {
  const items = finOutgoings().filter(o => o.frequency === 'yearly').map(o => {
    const due = nextAnnual(o.dueDate);
    if (!due) return { o, due: null, expected: null };
    const days = daysUntil(due);
    const monthsLeft = Math.min(12, Math.max(0, Math.ceil(days / 30.44)));
    return { o, due, days, monthsLeft, expected: num(o.amount) * (12 - monthsLeft) / 12 };
  }).sort((a, b) => (a.due || '9999') < (b.due || '9999') ? -1 : 1);
  const expected = sum(items.filter(i => i.due), i => i.expected);
  const balance = num(fin().billsPot.balance);
  return { items, expected, balance, diff: balance - expected, undated: items.filter(i => !i.due).length };
}

function sortTasks(a, b) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const ad = a.due || '9999-99-99', bd = b.due || '9999-99-99';
  if (ad !== bd) return ad < bd ? -1 : 1;
  return (PRIORITIES[a.priority]?.rank ?? 1) - (PRIORITIES[b.priority]?.rank ?? 1);
}

