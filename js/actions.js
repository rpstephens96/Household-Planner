'use strict';
/* ===================== 10. ACTIONS & EVENT DELEGATION ===================== */
const findPerson = el => byId(state.people, el.dataset.id);
const findRecipient = el => byId(state.christmas.recipients, el.dataset.id);
const findList = el => byId(state.checklists, el.dataset.id);

const ACTIONS = {
  'close-modal': () => closeModal(),
  'sign-in': () => Auth.signIn(),
  'sign-out': () => Auth.confirmSignOut(),
  'open-backup': () => openBackupModal(),
  'open-quickadd': () => openQuickAdd(),
  'select-all': () => $$('#modal-form input[name=pid]').forEach(c => { c.checked = true; }),

  /* Tasks */
  'quick-task': () => taskForm(),
  'task-toggle': el => { const t = byId(state.tasks, el.dataset.id); if (!t) return; t.done = !t.done; touch(t); commit(); if (t.done) toast('Nice – task completed ✓'); },
  'task-edit': el => taskForm(el.dataset.id),
  'task-delete': el => confirmModal('Delete this task?', () => { state.tasks = state.tasks.filter(x => x.id !== el.dataset.id); commit(); }),
  'task-filter': el => { ui.taskFilter = el.dataset.val; render(); },
  'task-cat': el => { ui.taskCat = el.dataset.val; render(); },
  'task-cat-new': () => openModal({
    title: 'Add task category', submitLabel: 'Add category',
    body: field('Category name', inp('label', '', 'required maxlength="60" placeholder="e.g. Garden"')),
    onSubmit: fd => {
      const label = String(fd.get('label') || '').trim();
      if (!label) { toast('Enter a category name', 'error'); return false; }
      if (taskCategories().some(([, name]) => name.toLowerCase() === label.toLowerCase())) { toast('That category already exists', 'error'); return false; }
      state.taskCats.push(touch({ id: uid(), label })); commit(); toast('Category added');
    }
  }),
  'tasks-tab': el => { ui.tasksTab = el.dataset.val; if (route() === 'tasks') render(); else location.hash = '#/tasks'; },
  'tasks-clear-done': () => confirmModal('Remove all completed tasks?', () => { state.tasks = state.tasks.filter(x => !x.done); commit(); }, { yesLabel: 'Clear' }),

  /* Checklists */
  'cl-new': () => checklistForm(),
  'cl-edit': el => checklistForm(el.dataset.id),
  'cl-collapse': el => { ui.clCollapsed[el.dataset.id] = !ui.clCollapsed[el.dataset.id]; render(); },
  'cl-toggle-item': el => { const c = findList(el); const i = c && byId(c.items, el.dataset.item); if (!i) return; i.done = !i.done; touch(c); commit(); },
  'cl-del-item': el => { const c = findList(el); if (!c) return; c.items = c.items.filter(i => i.id !== el.dataset.item); touch(c); commit(); },
  'cl-move-item': el => {
    const c = findList(el); if (!c) return;
    const from = c.items.findIndex(i => i.id === el.dataset.item), to = from + Number(el.dataset.val);
    if (from < 0 || !Number.isInteger(to) || to < 0 || to >= c.items.length) return;
    [c.items[from], c.items[to]] = [c.items[to], c.items[from]];
    focusAfterRender = `[data-action="cl-move-item"][data-id="${c.id}"][data-item="${el.dataset.item}"][data-val="${el.dataset.val}"]`;
    touch(c); commit();
  },
  'cl-reset': el => { const c = findList(el); if (!c) return; c.items.forEach(i => { i.done = false; }); touch(c); commit(); toast('Checklist reset'); },
  'cl-dup': el => { const c = findList(el); if (!c) return; const copy = touch({ id: uid(), title: `${c.title} – ${fmtDate(todayStr(), { day: 'numeric', month: 'short' })}`, reusable: false, items: c.items.map(i => ({ id: uid(), text: i.text, done: false })) }); state.checklists.unshift(copy); commit(); toast('New checklist created from template'); },
  'cl-delete': el => confirmModal('Delete this checklist and all its items?', () => { state.checklists = state.checklists.filter(x => x.id !== el.dataset.id); commit(); }),

  /* Birthdays */
  'person-new': () => personForm(),
  'person-edit': el => personForm(el.dataset.id),
  'person-toggle': el => { ui.personOpen[el.dataset.id] = !ui.personOpen[el.dataset.id]; render(); },
  'person-open': (el, e) => { e.preventDefault(); ui.personOpen[el.dataset.id] = true; location.hash = '#/birthdays'; setTimeout(() => { const n = document.getElementById('person-' + el.dataset.id); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); },
  'person-delete': el => { const p = findPerson(el); if (p) confirmModal(`Delete ${esc(p.name)} and all their gift ideas and history?`, () => { state.people = state.people.filter(x => x.id !== p.id); state.christmas.recipients.forEach(r => { if (r.personId === p.id) r.personId = null; }); commit(); }); },
  'person-archive': el => { const p = findPerson(el); if (!p || !p.finalGift) return; p.history.push({ id: uid(), year: Number((p.cycleFor || todayStr()).slice(0, 4)), occasion: 'Birthday', gift: p.finalGift.title, price: num(p.finalGift.price), notes: '' }); p.finalGift = null; p.cardBought = false; p.cardSent = false; touch(p); commit(); toast('Archived to gift history'); },
  'idea-select': el => { const p = findPerson(el); const i = p && byId(p.ideas, el.dataset.item); if (!i) return; p.finalGift = { title: i.title, price: num(i.price), status: p.finalGift?.status || 'idea', ideaId: i.id }; touch(p); commit(); toast('Final gift selected'); },
  'idea-delete': el => { const p = findPerson(el); if (!p) return; p.ideas = p.ideas.filter(i => i.id !== el.dataset.item); if (p.finalGift && p.finalGift.ideaId === el.dataset.item) p.finalGift.ideaId = null; touch(p); commit(); },
  'final-custom': el => finalGiftForm(el.dataset.id),
  'final-clear': el => { const p = findPerson(el); if (!p) return; p.finalGift = null; touch(p); commit(); },
  'final-status': el => { const p = findPerson(el); if (!p || !p.finalGift) return; p.finalGift.status = el.dataset.val; touch(p); commit(); },
  'card-bought': el => { const p = findPerson(el); if (!p) return; p.cardBought = !p.cardBought; if (!p.cardBought) p.cardSent = false; touch(p); commit(); },
  'card-sent': el => { const p = findPerson(el); if (!p) return; p.cardSent = !p.cardSent; if (p.cardSent) p.cardBought = true; touch(p); commit(); },
  'history-add': el => historyForm(el.dataset.id),
  'history-delete': el => { const p = findPerson(el); if (!p) return; p.history = p.history.filter(h => h.id !== el.dataset.item); touch(p); commit(); },

  /* Christmas */
  'xmas-budget': () => budgetForm(),
  'xmas-import': () => importRecipientsForm(),
  'xmas-recipient-new': () => recipientForm(),
  'xmas-recipient-edit': el => recipientForm(el.dataset.id),
  'xmas-toggle': el => { ui.xmasOpen[el.dataset.id] = !ui.xmasOpen[el.dataset.id]; render(); },
  'xmas-complete': el => { const r = findRecipient(el); if (!r) return; r.complete = !recipientDone(r); touch(r); commit(); },
  'xmas-recipient-delete': el => { const r = findRecipient(el); if (r) confirmModal(`Remove ${esc(r.name)} and their ${r.gifts.length} gift(s) from Christmas ${state.christmas.year}?`, () => { state.christmas.recipients = state.christmas.recipients.filter(x => x.id !== r.id); commit(); }, { yesLabel: 'Remove' }); },
  'xmas-gift-new': el => xmasGiftForm(el.dataset.id || null),
  'xmas-gift-edit': el => xmasGiftForm(el.dataset.id, el.dataset.item),
  'xmas-gift-delete': el => { const r = findRecipient(el); if (!r) return; r.gifts = r.gifts.filter(g => g.id !== el.dataset.item); touch(r); commit(); },
  'xmas-filter': el => { ui.xmasFilter = el.dataset.val; render(); },
  'xmas-new-year': () => {
    const c = state.christmas;
    confirmModal(`This archives Christmas ${c.year}: purchased gifts are copied into each linked person's gift history, gifts are cleared, and your recipient list and budgets are kept for ${c.year + 1}.`, () => {
      const xs = xmasStats();
      c.archive.push({ year: c.year, budget: c.budget, spent: xs.spent, recipients: clone(c.recipients) });
      c.recipients.forEach(r => {
        const p = r.personId ? byId(state.people, r.personId) : null;
        if (p) { r.gifts.filter(g => XMAS_IDX[g.status] >= XMAS_BOUGHT_IDX).forEach(g => p.history.push({ id: uid(), year: c.year, occasion: 'Christmas', gift: g.title, price: num(g.price), notes: '' })); touch(p); }
        r.gifts = []; r.complete = false; touch(r);
      });
      c.year += 1; commit(); toast(`Ready for Christmas ${c.year} 🎄`);
    }, { title: `Start Christmas ${c.year + 1}?`, yesLabel: 'Archive & start', danger: false });
  },

  /* Vault */
  'vault-new': () => vaultForm(),
  'vault-edit': el => vaultForm(el.dataset.id),
  'vault-delete': el => confirmModal('Delete this vault entry?', () => { state.vault = state.vault.filter(x => x.id !== el.dataset.id); commit(); }),
  'vault-cat': el => { ui.vaultCat = el.dataset.val; render(); },
  'copy': el => { const v = el.dataset.val; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast('Copied to clipboard')).catch(() => toast('Copy not available – select the text manually', 'error')); },


  /* Vault categories */
  'vault-cats': () => vaultCatsModal(),
  'vcat-new': () => vaultCatForm(),
  'vcat-edit': el => vaultCatForm(el.dataset.id),
  'vcat-move': el => {
    const L = state.vaultCats, i = L.findIndex(c => c.id === el.dataset.id), j = i + Number(el.dataset.val);
    if (i < 0 || j < 0 || j >= L.length) return;
    [L[i], L[j]] = [L[j], L[i]]; commit(); vaultCatsModal();
  },
  'vcat-delete': el => {
    const c = vcats().find(x => x.id === el.dataset.id); if (!c || c.id === 'other') return;
    const n = state.vault.filter(v => v.category === c.id).length;
    confirmModal(`Delete the “${esc(c.label)}” category?${n ? ` Its ${n} entr${n === 1 ? 'y' : 'ies'} will move to “Other”.` : ''}`, () => {
      state.vault.forEach(v => { if (v.category === c.id) { v.category = 'other'; touch(v); } });
      state.vaultCats = state.vaultCats.filter(x => x.id !== c.id);
      if (ui.vaultCat === c.id) ui.vaultCat = 'all';
      commit(); vaultCatsModal();
    });
  },

  /* Finance planner */
  'fin-tab': el => { ui.finTab = el.dataset.val; if (route() !== 'finance') location.hash = '#/finance'; else { render(); window.scrollTo({ top: 0 }); } },
  'fin-out-filter': el => { ui.finOutFilter = el.dataset.val; render(); },
  'fin-add-income': () => finItemForm('income'),
  'fin-edit-income': el => finItemForm('income', el.dataset.id),
  'fin-del-income': el => confirmModal('Delete this income?', () => { fin().incomes = fin().incomes.filter(x => x.id !== el.dataset.id); commit(); }),
  'fin-add-out': () => finItemForm('out'),
  'fin-edit-out': el => { const id = el.dataset.id; if (id.startsWith('v_')) vaultForm(id.slice(2)); else finItemForm('out', id); },
  'fin-del-out': el => {
    const id = el.dataset.id;
    if (id.startsWith('v_')) {
      const v = byId(state.vault, id.slice(2)); if (!v) return;
      confirmModal(`Remove “${esc(v.provider)}” from the budget? The vault entry itself is kept.`, () => { v.inBudget = false; touch(v); commit(); }, { yesLabel: 'Remove from budget' });
    } else confirmModal('Delete this outgoing?', () => { fin().outgoings = fin().outgoings.filter(x => x.id !== id); commit(); });
  },
  'fin-cats': el => finCatsModal(el.dataset.val === 'income' ? 'income' : 'out'),
  'fincat-edit': el => finCatEditForm(el.dataset.kind, el.dataset.id),
  'fincat-move': el => {
    const L = el.dataset.kind === 'income' ? fin().incomeCats : fin().outCats;
    const i = L.findIndex(c => c.id === el.dataset.id), j = i + Number(el.dataset.val);
    if (i < 0 || j < 0 || j >= L.length) return;
    [L[i], L[j]] = [L[j], L[i]]; commit(); finCatsModal(el.dataset.kind);
  },
  'fincat-del': el => {
    const kind = el.dataset.kind, id = el.dataset.id;
    const fb = kind === 'income' ? 'inc_other' : 'out_other'; if (id === fb) return;
    const L = kind === 'income' ? fin().incomeCats : fin().outCats;
    const c = L.find(x => x.id === id); if (!c) return;
    confirmModal(`Delete the “${esc(c.label)}” category? Items in it move to “${esc(finCat(kind, fb).label)}”.`, () => {
      const F = fin();
      (kind === 'income' ? F.incomes : F.outgoings).forEach(o => { if (o.categoryId === id) { o.categoryId = fb; touch(o); } });
      if (kind === 'out') state.vault.forEach(v => { if (v.finCat === id) { v.finCat = fb; touch(v); } });
      if (kind === 'income') F.incomeCats = F.incomeCats.filter(x => x.id !== id); else F.outCats = F.outCats.filter(x => x.id !== id);
      commit(); finCatsModal(kind);
    });
  },
  'pot-new': () => potForm(),
  'pot-edit': el => potForm(el.dataset.id),
  'pot-del': el => confirmModal('Delete this savings pot?', () => { fin().pots = fin().pots.filter(x => x.id !== el.dataset.id); commit(); }),
  'billspot-edit': () => billsPotForm(),
  'csv-remove': el => { if (!csvSession) return; csvSession.files.splice(Number(el.dataset.val), 1); if (!csvSession.files.length) csvSession = null; else analyseCsv(); render(); },
  'csv-clear': () => { csvSession = null; render(); toast('Statement data cleared'); },
  'csv-sel': el => $$('#view input[name=pick]').forEach(c => { c.checked = el.dataset.val === 'all'; }),

  /* Backup & data */
  'export-json': () => exportJSON(),
  'share-json': () => shareJSON(),
  'import-json': () => { const f = $('#import-file'); f.value = ''; f.click(); },
  'import-replace': () => applyImport('replace'),
  'import-merge': () => applyImport('merge'),
  'clear-sample': () => confirmModal('Remove all sample entries? Anything you have added yourself is kept.', () => {
    const real = x => !x.sample;
    const sampleIds = new Set(state.people.filter(x => x.sample).map(x => x.id));
    state.tasks = state.tasks.filter(real); state.checklists = state.checklists.filter(real); state.people = state.people.filter(real); state.vault = state.vault.filter(real);
    state.christmas.recipients = state.christmas.recipients.filter(r => real(r) && !sampleIds.has(r.personId));
    if (state.christmas.sampleBudget) { state.christmas.budget = 0; delete state.christmas.sampleBudget; }
    commit(); toast('Sample data cleared');
  }, { yesLabel: 'Clear sample data' }),
  'load-sample': () => confirmModal('Add the sample entries back alongside your own data?', () => {
    const s = sampleState();
    const strip = arr => arr.filter(x => !x.sample);
    state.tasks = [...strip(state.tasks), ...s.tasks]; state.checklists = [...strip(state.checklists), ...s.checklists];
    state.people = [...strip(state.people), ...s.people]; state.vault = [...strip(state.vault), ...s.vault];
    state.christmas.recipients = [...strip(state.christmas.recipients), ...s.christmas.recipients];
    if (!state.christmas.budget) { state.christmas.budget = s.christmas.budget; state.christmas.sampleBudget = true; }
    commit(); toast('Sample data loaded');
  }, { yesLabel: 'Load samples', danger: false }),
  'reset-all': () => confirmModal('Erase ALL data on this device? Export a backup first if unsure. If live sync is on, the empty data will also sync to your partner.', () => {
    const keep = state.settings; state = defaultState(); state.settings = keep; commit(); toast('All data erased');
  }, { yesLabel: 'Erase everything' }),

  /* Sync */
  'sync-genid': () => { const i = $('input[name=householdId]'); if (i) i.value = 'home-' + Array.from(crypto.getRandomValues(new Uint8Array(10)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join(''); },
  'sync-now': () => { if (!Sync.enabled()) { toast('Live sync is not enabled', 'error'); return; } Sync.setStatus('connecting'); Sync.pull(); },
  'sync-copy-link': () => { const l = syncSetupLink(); (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject()).then(() => toast('Setup link copied – send it to the other phone')).catch(() => prompt('Copy this link:', l)); }
};

const FORMS = {
  'look-ahead': fd => {
    const days = Number(fd.get('days'));
    if (!Number.isInteger(days) || days < 1 || days > 365) { toast('Enter a number of days from 1 to 365', 'error'); return; }
    state.lookAheadDays = days; commit(); toast('Reminder window saved');
  },
  'csv-apply': fd => {
    const S = csvSession; if (!S) return;
    const picks = fd.getAll('pick').map(Number);
    if (!picks.length) { toast('Tick at least one suggestion', 'error'); return; }
    let nIn = 0, nOut = 0, nLink = 0;
    picks.forEach(i => {
      const s = S.sugs[i]; if (!s) return;
      const name = String(fd.get('name_' + i) || s.name).trim() || s.name;
      const amount = num(fd.get('amount_' + i));
      const frequency = fd.get('freq_' + i) === 'yearly' ? 'yearly' : 'monthly';
      const categoryId = fd.get('cat_' + i) || (s.dir === 'in' ? 'inc_other' : 'out_other');
      if (amount <= 0) return;
      if (s.dir === 'in') { fin().incomes.push(touch({ id: uid(), name, amount, frequency, categoryId, notes: 'Found from bank statement' })); nIn++; return; }
      const type = fd.get('type_' + i) === 'discretionary' ? 'discretionary' : 'essential';
      const v = s.vaultId && fd.get('link_' + i) === 'on' ? byId(state.vault, s.vaultId) : null;
      if (v) { v.inBudget = true; v.finCat = categoryId; v.finType = type; touch(v); nLink++; return; }
      fin().outgoings.push(touch({ id: uid(), name, amount, frequency, categoryId, type, dueDate: frequency === 'yearly' ? (nextAnnual(s.last) || '') : '',
        notes: s.kind === 'variable' ? 'Average from bank statement' : 'Found from bank statement' }));
      nOut++;
    });
    csvSession = null;                       // statement data is discarded once used
    ui.finTab = nIn && !nOut && !nLink ? 'income' : 'outgoings';
    commit(); window.scrollTo({ top: 0 });
    toast(`Added ${nIn + nOut} item${nIn + nOut === 1 ? '' : 's'}${nLink ? ` · linked ${nLink} vault entr${nLink === 1 ? 'y' : 'ies'}` : ''}`);
  },
  'task-quick': (fd, form) => {
    const title = String(fd.get('title') || '').trim(); if (!title) return;
    state.tasks.push(touch({ id: uid(), title, due: fd.get('due') || '', priority: fd.get('priority') || 'medium', category: fd.get('category') || 'general', notes: '', done: false }));
    focusAfterRender = '[data-form="task-quick"] input[name=title]';
    commit(); toast('Task added');
  },
  'cl-add-item': (fd, form) => {
    const c = byId(state.checklists, form.dataset.id); const text = String(fd.get('text') || '').trim();
    if (!c || !text) return;
    c.items.push({ id: uid(), text, done: false }); touch(c);
    focusAfterRender = `[data-focus-key="cl-${c.id}"]`;
    commit();
  },
  'idea-add': (fd, form) => {
    const p = byId(state.people, form.dataset.id); const title = String(fd.get('title') || '').trim();
    if (!p || !title) return;
    p.ideas.push({ id: uid(), title, price: num(fd.get('price')), link: String(fd.get('link') || '').trim() }); touch(p);
    focusAfterRender = `[data-focus-key="idea-${p.id}"]`;
    commit();
  },
  'sync-settings': fd => {
    const sc = state.settings.sync;
    const newId = String(fd.get('householdId') || '').trim();
    const enabled = fd.get('enabled') === 'on';
    if (newId && !HOUSEHOLD_ID_RE.test(newId)) { toast('Household ID: 6–64 letters, numbers, - or _', 'error'); return; }
    if (enabled && !newId) { toast('Enter or generate a Household ID first', 'error'); return; }
    if (newId !== sc.householdId) state.meta.updatedAt = 0;   // joining a household: existing cloud data wins; empty cloud receives ours
    Object.assign(sc, { householdId: newId, enabled });
    persist(); Sync.start(); render();
    toast(sc.enabled ? 'Sync settings saved – connecting…' : 'Sync settings saved (sync off)');
  }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.action];
  if (!fn) return;
  if (!appBooted && el.dataset.action !== 'sign-in') return;   // auth gate: nothing works before sign-in
  if (el.tagName === 'A' && el.dataset.action !== 'close-modal') e.preventDefault();
  fn(el, e);
});

document.addEventListener('submit', e => {
  const form = e.target;
  if (!appBooted) { e.preventDefault(); return; }
  if (form.id === 'modal-form') {
    e.preventDefault();
    if (!modalHandler) return;
    const seq = modalSeq, handler = modalHandler;
    const result = handler(new FormData(form), form);
    if (result !== false && seq === modalSeq) closeModal();   // don't close a modal opened by the handler
    return;
  }
  const key = form.dataset.form;
  if (key && FORMS[key]) { e.preventDefault(); FORMS[key](new FormData(form), form); }
});

document.addEventListener('change', e => {
  const el = e.target;
  if (!appBooted) return;
  if (el.id === 'import-file' && el.files && el.files[0]) { closeModal(); handleImportFile(el.files[0]); return; }
  if (el.id === 'csv-input' && el.files && el.files.length) { loadCsvFiles(el.files); return; }
  if (el.dataset.change === 'csv-map' && csvSession) {
    const f = csvSession.files[Number(el.dataset.file)]; if (!f) return;
    if (el.dataset.key === 'flip') f.map.flip = el.checked; else f.map[el.dataset.key] = Number(el.value);
    if (el.dataset.key === 'amount' && f.map.amount >= 0) { f.map.in = -1; f.map.out = -1; }
    if ((el.dataset.key === 'in' || el.dataset.key === 'out') && Number(el.value) >= 0) f.map.amount = -1;
    if (f.sig) { fin().csvProfiles[f.sig] = { ...f.map }; save(); }   // remember layout only – never transactions
    analyseCsv(); render(); return;
  }
  if (el.dataset.change === 'pot-value' || el.dataset.change === 'pot-mode') {
    const p = byId(fin().pots, el.dataset.id); if (!p) return;
    if (el.dataset.change === 'pot-value') p.value = num(el.value); else p.mode = el.value === 'percent' ? 'percent' : 'fixed';
    touch(p); commit(); return;
  }
  if (el.dataset.change === 'xmas-gift-status') {
    const r = byId(state.christmas.recipients, el.dataset.id); const g = r && byId(r.gifts, el.dataset.item);
    if (!g) return; g.status = el.value; touch(r); commit();
  }
});

document.addEventListener('input', e => {
  if (e.target.dataset.input === 'vault-search') {
    ui.vaultSearch = e.target.value;
    $('#vault-list').innerHTML = vaultListHTML(); refreshIcons();
  }
});

document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modal-root').innerHTML) closeModal(); });
