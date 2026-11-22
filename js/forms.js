'use strict';
/* ============================== 7. FORMS ============================== */
function taskForm(id) {
  const t = id ? byId(state.tasks, id) : null;
  openModal({
    title: t ? 'Edit task' : 'New task', submitLabel: t ? 'Save' : 'Add task',
    body: `${field('Task', inp('title', t?.title, 'required placeholder="What needs doing?"'))}
      <div class="grid grid-cols-2 gap-3">${field('Due date', inp('due', t?.due, 'type="date"'))}
      ${field('Priority', sel('priority', Object.entries(PRIORITIES).map(([k, v]) => [k, v.label]), t?.priority || 'medium'))}</div>
      ${field('Category', sel('category', Object.entries(TASK_CATS), t?.category || 'general'))}
      ${field('Notes', ta('notes', t?.notes, 'placeholder="Optional"'))}`,
    onSubmit: fd => {
      const data = { title: fd.get('title').trim(), due: fd.get('due') || '', priority: fd.get('priority'), category: fd.get('category'), notes: fd.get('notes').trim() };
      const cur = id ? byId(state.tasks, id) : null;
      if (cur) Object.assign(cur, data, { updatedAt: Date.now() });
      else state.tasks.push(touch({ id: uid(), done: false, ...data }));
      commit(); toast(cur ? 'Task updated' : 'Task added');
    }
  });
}

function checklistForm(id) {
  const c = id ? byId(state.checklists, id) : null;
  openModal({
    title: c ? 'Edit checklist' : 'New checklist', submitLabel: c ? 'Save' : 'Create',
    body: `${field('Title', inp('title', c?.title, 'required placeholder="e.g. Holiday Packing"'))}
      ${chk('reusable', 'Reusable template', c ? c.reusable : true, 'Keep it and reset the ticks each time (e.g. Food Shop).')}
      ${c ? '' : field('Items', ta('items', '', 'rows="6" placeholder="One item per line"'), 'You can add more items later.')}`,
    onSubmit: fd => {
      const cur = id ? byId(state.checklists, id) : null;
      if (cur) { cur.title = fd.get('title').trim(); cur.reusable = fd.get('reusable') === 'on'; touch(cur); }
      else {
        const items = String(fd.get('items') || '').split('\n').map(s => s.trim()).filter(Boolean).map(text => ({ id: uid(), text, done: false }));
        state.checklists.unshift(touch({ id: uid(), title: fd.get('title').trim(), reusable: fd.get('reusable') === 'on', items }));
        ui.tasksTab = 'checklists';
        if (route() !== 'tasks') location.hash = '#/tasks';
      }
      commit();
    }
  });
}

function personForm(id) {
  const p = id ? byId(state.people, id) : null;
  openModal({
    title: p ? 'Edit person' : 'Add birthday', submitLabel: p ? 'Save' : 'Add',
    body: `${field('Name', inp('name', p?.name, 'required placeholder="e.g. Auntie Sue"'))}
      ${field('Relationship', inp('relationship', p?.relationship, 'placeholder="e.g. Aunt, Friend, Colleague" list="rel-list"') + `<datalist id="rel-list">${['Mother', 'Father', 'Sister', 'Brother', 'Son', 'Daughter', 'Grandparent', 'Aunt', 'Uncle', 'Cousin', 'Niece', 'Nephew', 'Friend', 'Godchild', 'Colleague'].map(x => `<option value="${x}">`).join('')}</datalist>`)}
      ${field('Date of birth', inp('dob', p?.dob, 'type="date" required'), 'If you don\'t know the year, pick any year and tick the box below.')}
      ${chk('yearUnknown', 'Birth year unknown (don\'t show age)', p ? p.yearKnown === false : false)}
      ${field('Notes', ta('notes', p?.notes, 'placeholder="Likes, sizes, allergies…"'))}`,
    onSubmit: fd => {
      const data = { name: fd.get('name').trim(), relationship: fd.get('relationship').trim(), dob: fd.get('dob'), yearKnown: fd.get('yearUnknown') !== 'on', notes: fd.get('notes').trim() };
      const cur = id ? byId(state.people, id) : null;
      if (cur) { const dobChanged = cur.dob !== data.dob; Object.assign(cur, data); if (dobChanged) cur.cycleFor = nextBirthday(cur).date; touch(cur); }
      else { const np = { id: uid(), ideas: [], history: [], finalGift: null, cardBought: false, cardSent: false, ...data }; np.cycleFor = nextBirthday(np).date; state.people.push(touch(np)); ui.personOpen[np.id] = true; }
      commit(); toast(cur ? 'Saved' : 'Birthday added');
    }
  });
}

function finalGiftForm(pid) {
  const p = byId(state.people, pid); if (!p) return;
  const fg = p.finalGift;
  openModal({
    title: fg ? 'Edit final gift' : 'Custom final gift',
    body: `${field('Gift', inp('title', fg?.title, 'required placeholder="What are you giving?"'))}
      <div class="grid grid-cols-2 gap-3">${field('Price', moneyInp('price', fg?.price))}
      ${field('Status', sel('status', GIFT_STATUS.map(s => [s.id, s.label]), fg?.status || 'idea'))}</div>`,
    onSubmit: fd => {
      const pp = byId(state.people, pid); if (!pp) return;
      pp.finalGift = { title: fd.get('title').trim(), price: num(fd.get('price')), status: fd.get('status'), ideaId: pp.finalGift?.ideaId || null };
      touch(pp); commit();
    }
  });
}

function historyForm(pid) {
  const y = new Date().getFullYear();
  openModal({
    title: 'Add past gift',
    body: `${field('Gift', inp('gift', '', 'required placeholder="What did you give?"'))}
      <div class="grid grid-cols-3 gap-3">${field('Year', sel('year', Array.from({ length: 15 }, (_, i) => [y - i, y - i]), y - 1))}
      ${field('Occasion', sel('occasion', [['Birthday', 'Birthday'], ['Christmas', 'Christmas'], ['Other', 'Other']], 'Birthday'))}
      ${field('Price', moneyInp('price', ''))}</div>
      ${field('Notes', inp('notes', '', 'placeholder="Optional – e.g. they loved it"'))}`,
    onSubmit: fd => {
      const p = byId(state.people, pid); if (!p) return;
      p.history.push({ id: uid(), gift: fd.get('gift').trim(), year: Number(fd.get('year')), occasion: fd.get('occasion'), price: num(fd.get('price')), notes: fd.get('notes').trim() });
      touch(p); commit();
    }
  });
}

function budgetForm() {
  openModal({
    title: `Christmas ${state.christmas.year} budget`,
    body: `${field('Overall budget', moneyInp('budget', state.christmas.budget || ''))}
      ${field('Year', inp('year', state.christmas.year, 'type="number" min="2000" max="2100" required'))}`,
    onSubmit: fd => { state.christmas.budget = num(fd.get('budget')); state.christmas.year = Number(fd.get('year')) || state.christmas.year; delete state.christmas.sampleBudget; commit(); }
  });
}

function recipientForm(id) {
  const r = id ? byId(state.christmas.recipients, id) : null;
  openModal({
    title: r ? 'Edit recipient' : 'Add Christmas recipient', submitLabel: r ? 'Save' : 'Add',
    body: `${field('Name', inp('name', r?.name, 'required placeholder="e.g. Mrs Jones (teacher)"'))}
      ${field('Target budget', moneyInp('budget', r?.budget))}
      ${field('Notes', inp('notes', r?.notes, 'placeholder="Optional – sizes, Secret Santa limit…"'))}`,
    onSubmit: fd => {
      const data = { name: fd.get('name').trim(), budget: num(fd.get('budget')), notes: fd.get('notes').trim() };
      const cur = id ? byId(state.christmas.recipients, id) : null;
      if (cur) Object.assign(cur, data, { updatedAt: Date.now() });
      else state.christmas.recipients.push(touch({ id: uid(), personId: null, gifts: [], ...data }));
      commit();
    }
  });
}

function xmasGiftForm(rid, gid) {
  const R = state.christmas.recipients;
  const r = rid ? byId(R, rid) : null;
  const g = r && gid ? byId(r.gifts, gid) : null;
  const recipientPicker = r ? '' : field('For', sel('rid', [...R.map(x => [x.id, x.name]), ['__new', '+ New recipient…']], R[0]?.id || '__new'))
    + `<div data-newname class="${R.length ? 'hidden' : ''}">${field('New recipient name', inp('newName', '', 'placeholder="Name"'))}</div>`;
  openModal({
    title: g ? 'Edit gift' : `Add gift${r ? ' for ' + esc(r.name) : ''}`, submitLabel: g ? 'Save' : 'Add gift',
    body: `${recipientPicker}
      ${field('Gift', inp('title', g?.title, 'required placeholder="e.g. Cosy slippers"'))}
      <div class="grid grid-cols-2 gap-3">${field('Price', moneyInp('price', g?.price))}
      ${field('Status', sel('status', XMAS_STATUS.map(s => [s.id, s.label]), g?.status || 'idea'))}</div>
      ${field('Link', inp('link', g?.link, 'placeholder="Optional shop link"'))}`,
    onSubmit: fd => {
      let rr = rid ? byId(state.christmas.recipients, rid) : null;
      if (!rr) {
        const sid = fd.get('rid');
        if (sid && sid !== '__new') rr = byId(state.christmas.recipients, sid);
        else {
          const nm = String(fd.get('newName') || '').trim();
          if (!nm) { toast('Enter a name for the new recipient', 'error'); return false; }
          rr = touch({ id: uid(), name: nm, personId: null, budget: 0, notes: '', gifts: [] });
          state.christmas.recipients.push(rr);
        }
      }
      if (!rr) return;
      const data = { title: fd.get('title').trim(), price: num(fd.get('price')), status: fd.get('status'), link: fd.get('link').trim() };
      const cur = gid ? byId(rr.gifts, gid) : null;
      if (cur) Object.assign(cur, data); else rr.gifts.push({ id: uid(), ...data });
      touch(rr); commit();
      if (route() !== 'christmas') toast(`Gift added for ${rr.name}`);
    }
  });
  const s = $('#modal-form select[name=rid]');
  if (s) s.addEventListener('change', () => $('#modal-form [data-newname]').classList.toggle('hidden', s.value !== '__new'));
}

function importRecipientsForm() {
  const linked = new Set(state.christmas.recipients.map(r => r.personId).filter(Boolean));
  const avail = state.people.filter(p => !linked.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));
  if (!avail.length) { toast(state.people.length ? 'Everyone on the birthday list is already added' : 'Your birthday list is empty'); return; }
  openModal({
    title: 'Import from birthday list', submitLabel: 'Import selected',
    body: `<div class="flex justify-between items-center"><p class="text-sm text-slate-500">Choose who to add to Christmas ${state.christmas.year}.</p>
        <button type="button" data-action="select-all" class="text-sm text-teal-700 font-medium">Select all</button></div>
      <div class="space-y-2">${avail.map(p => `<label class="flex items-center gap-3 rounded-xl ring-1 ring-slate-200 px-3 py-2.5 cursor-pointer has-[:checked]:ring-teal-400 has-[:checked]:bg-teal-50/50">
        <input type="checkbox" name="pid" value="${p.id}" class="w-5 h-5 accent-teal-600">
        <span class="w-8 h-8 rounded-full ${avatarCls(p.name)} flex items-center justify-center text-xs font-semibold">${initials(p.name)}</span>
        <span class="text-sm font-medium text-slate-800">${esc(p.name)}<span class="block text-xs font-normal text-slate-500">${esc(p.relationship || '')}</span></span></label>`).join('')}</div>
      ${field('Default target budget each', moneyInp('budget', ''))}`,
    onSubmit: fd => {
      const ids = fd.getAll('pid');
      if (!ids.length) { toast('Select at least one person', 'error'); return false; }
      const b = num(fd.get('budget'));
      ids.forEach(pid => { const p = byId(state.people, pid); if (p) state.christmas.recipients.push(touch({ id: uid(), name: p.name, personId: p.id, budget: b, notes: '', gifts: [] })); });
      commit(); toast(`${ids.length} recipient${ids.length > 1 ? 's' : ''} added`);
    }
  });
}

function vaultForm(id) {
  const v = id ? byId(state.vault, id) : null;
  openModal({
    title: v ? 'Edit vault entry' : 'Add to Household Vault', submitLabel: v ? 'Save' : 'Add entry', wide: true,
    body: `<div class="grid sm:grid-cols-2 gap-4">
        ${field('Category', sel('category', vcats().map(c => [c.id, c.label]), (v && vcat(v.category).id) || (ui.vaultCat !== 'all' && ui.vaultCat) || vcats()[0].id))}
        ${field('Provider name', inp('provider', v?.provider, 'required placeholder="e.g. Aviva"'))}
        ${field('Description', inp('name', v?.name, 'placeholder="e.g. Buildings & contents"'))}
        ${field('Policy / account number', inp('accountNo', v?.accountNo, 'placeholder="e.g. AV-123456"'))}
        ${field('Renewal / end date', inp('renewalDate', v?.renewalDate, 'type="date"'))}
        <div>${fieldDiv('Cost', `<div class="flex gap-2">${moneyInp('cost', v?.cost)}<div class="flex rounded-xl bg-slate-100 p-1 shrink-0">
          ${[['monthly', 'Monthly'], ['annual', 'Annual']].map(([k, l]) => `<label class="cursor-pointer"><input type="radio" name="costPeriod" value="${k}" class="peer sr-only" ${(v?.costPeriod || 'monthly') === k ? 'checked' : ''}><span class="block rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 peer-checked:bg-white peer-checked:shadow-sm peer-checked:text-slate-900">${l}</span></label>`).join('')}</div></div>`)}</div>
      </div>
      ${chk('autoRenew', 'Auto-renews', v ? v.autoRenew : true, 'Untick if it ends or needs action (e.g. fixed-rate mortgage reverting to SVR).')}
      <div class="rounded-xl bg-teal-50 p-3 ring-1 ring-teal-100">${field(`${icon('map-pin', 'w-4 h-4 inline -mt-0.5 text-teal-600')} Where to find it`, inp('location', v?.location, 'placeholder="e.g. Blue folder in study filing cabinet / Joint Gmail – search \'Aviva\' / 1Password Shared Vault"'), 'Exactly where the paperwork, emails or logins live.')}</div>
      <div class="rounded-xl ring-1 ring-slate-200 p-3 space-y-3">
        ${chk('inBudget', 'Include in finance planner budget', v ? !!v.inBudget : false, 'The cost and Monthly/Annual setting above feed the budget automatically. Annual costs are saved for via the bills pot, using the renewal date.')}
        <div class="grid grid-cols-2 gap-3">${field('Budget category', sel('finCat', fin().outCats.map(c => [c.id, c.label]), v ? vaultFinCat(v) : 'out_other'))}
        ${field('Type', sel('finType', Object.entries(FIN_TYPES), v?.finType || 'essential'))}</div>
      </div>
      ${field('Login / portal URL', inp('url', v?.url, 'placeholder="https://…"'))}
      ${field('Notes', ta('notes', v?.notes, 'placeholder="Excess amounts, cancellation notice period, broker contact…"'))}`,
    onSubmit: fd => {
      const data = { category: fd.get('category'), provider: fd.get('provider').trim(), name: fd.get('name').trim(), accountNo: fd.get('accountNo').trim(), renewalDate: fd.get('renewalDate') || '',
        cost: num(fd.get('cost')), costPeriod: fd.get('costPeriod') || 'monthly', autoRenew: fd.get('autoRenew') === 'on', location: fd.get('location').trim(), url: fd.get('url').trim(), notes: fd.get('notes').trim(),
        inBudget: fd.get('inBudget') === 'on', finCat: fd.get('finCat') || '', finType: fd.get('finType') === 'discretionary' ? 'discretionary' : 'essential' };
      const cur = id ? byId(state.vault, id) : null;
      if (cur) Object.assign(cur, data, { updatedAt: Date.now() }); else state.vault.push(touch({ id: uid(), ...data }));
      commit(); toast(cur ? 'Saved' : 'Added to vault');
    }
  });
}

function openQuickAdd() {
  const tiles = [['quick-task', 'list-todo', 'Task', 'bg-teal-50 text-teal-600'], ['cl-new', 'list-checks', 'Checklist', 'bg-sky-50 text-sky-600'], ['person-new', 'cake', 'Birthday', 'bg-violet-50 text-violet-600'],
    ['xmas-gift-new', 'gift', 'Christmas gift', 'bg-emerald-50 text-emerald-600'], ['xmas-recipient-new', 'user-plus', 'Christmas recipient', 'bg-rose-50 text-rose-600'], ['vault-new', 'shield-check', 'Policy / account', 'bg-amber-50 text-amber-600']];
  openModal({
    title: 'Quick add',
    body: `<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">${tiles.map(([a, i, l, c]) => `
      <button type="button" data-action="${a}" class="rounded-2xl ring-1 ring-slate-200 hover:ring-teal-300 hover:bg-slate-50 p-4 flex flex-col items-center gap-2 transition">
        <span class="w-11 h-11 rounded-xl ${c} flex items-center justify-center">${icon(i, 'w-5 h-5')}</span><span class="text-sm font-medium text-slate-700 text-center">${l}</span></button>`).join('')}</div>`
  });
}

/* ---------- Vault categories ---------- */
function vaultCatsModal() {
  const L = vcats();
  openModal({
    title: 'Vault categories',
    body: `<p class="text-sm text-slate-500">Add, rename, reorder or remove categories. Deleting a category moves its entries to “Other”.</p>
      <ul class="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">${L.map((c0, i) => {
        const c = vcat(c0.id); const n = state.vault.filter(v => vcat(v.category).id === c.id).length;
        return `<li class="flex items-center gap-2 px-3 py-2">
          <span class="w-8 h-8 rounded-lg ${c.bg} ${c.fg} flex items-center justify-center shrink-0">${icon(c.icon)}</span>
          <span class="flex-1 min-w-0"><span class="block text-sm font-medium text-slate-800 truncate">${esc(c.label)}</span><span class="block text-xs text-slate-500">${n} entr${n === 1 ? 'y' : 'ies'}</span></span>
          <button type="button" data-action="vcat-move" data-id="${c.id}" data-val="-1" class="${ICON_BTN} !w-8 !h-8" ${i === 0 ? 'disabled style="opacity:.3"' : ''} aria-label="Move up">${icon('arrow-up', 'w-3.5 h-3.5')}</button>
          <button type="button" data-action="vcat-move" data-id="${c.id}" data-val="1" class="${ICON_BTN} !w-8 !h-8" ${i === L.length - 1 ? 'disabled style="opacity:.3"' : ''} aria-label="Move down">${icon('arrow-down', 'w-3.5 h-3.5')}</button>
          <button type="button" data-action="vcat-edit" data-id="${c.id}" class="${ICON_BTN} !w-8 !h-8" aria-label="Edit">${icon('pencil', 'w-3.5 h-3.5')}</button>
          ${c.id === 'other' ? '<span class="w-8"></span>' : `<button type="button" data-action="vcat-delete" data-id="${c.id}" class="${ICON_BTN} !w-8 !h-8 hover:!text-rose-600" aria-label="Delete">${icon('trash-2', 'w-3.5 h-3.5')}</button>`}
        </li>`; }).join('')}</ul>
      <button type="button" data-action="vcat-new" class="${BTN_SOFT} w-full">${icon('plus')}Add category</button>`
  });
}
function vaultCatForm(id) {
  const c = id ? vcats().find(x => x.id === id) : null;
  openModal({
    title: c ? 'Edit category' : 'New vault category', submitLabel: c ? 'Save' : 'Add',
    body: `${field('Name', inp('label', c?.label, 'required placeholder="e.g. Pets, Pensions, Vehicles"'))}
      <div><span class="block text-sm font-medium text-slate-700 mb-1.5">Colour</span><div class="flex flex-wrap gap-2.5">${Object.entries(COLOURS).map(([k, v]) => `<label class="cursor-pointer" title="${k}"><input type="radio" name="colour" value="${k}" class="peer sr-only" ${(c?.colour || 'teal') === k ? 'checked' : ''}><span class="block w-8 h-8 rounded-full ${v.dot} ring-2 ring-offset-2 ring-transparent peer-checked:ring-slate-800"></span></label>`).join('')}</div></div>
      <div><span class="block text-sm font-medium text-slate-700 mb-1.5">Icon</span><div class="grid grid-cols-6 sm:grid-cols-8 gap-2">${CAT_ICONS.map(n => `<label class="cursor-pointer"><input type="radio" name="icon" value="${n}" class="peer sr-only" ${(c?.icon || 'folder') === n ? 'checked' : ''}><span class="flex items-center justify-center h-10 rounded-xl ring-1 ring-slate-200 text-slate-600 peer-checked:ring-2 peer-checked:ring-teal-500 peer-checked:bg-teal-50 peer-checked:text-teal-700">${icon(n, 'w-5 h-5')}</span></label>`).join('')}</div></div>`,
    onSubmit: fd => {
      const data = { label: String(fd.get('label') || '').trim(), colour: fd.get('colour') || 'teal', icon: fd.get('icon') || 'folder' };
      if (!data.label) return false;
      const cur = id ? state.vaultCats.find(x => x.id === id) : null;
      if (cur) Object.assign(cur, data);
      else state.vaultCats.splice(Math.max(0, state.vaultCats.length - 1), 0, { id: 'vc_' + uid(), ...data });  // keep "Other" last
      commit(); vaultCatsModal();
    }
  });
}

/* ---------- Finance forms ---------- */
function finItemForm(kind, id) {
  const F = fin();
  const list = kind === 'income' ? F.incomes : F.outgoings;
  const o = id ? byId(list, id) : null;
  const cats = kind === 'income' ? F.incomeCats : F.outCats;
  const defCat = (o && o.categoryId) || (cats[0] && cats[0].id);
  const defType = o ? o.type : ((cats.find(c => c.id === defCat) || {}).essential === false ? 'discretionary' : 'essential');
  openModal({
    title: o ? `Edit ${kind === 'income' ? 'income' : 'outgoing'}` : (kind === 'income' ? 'Add income' : 'Add outgoing'), submitLabel: o ? 'Save' : 'Add',
    body: `${field('Name', inp('name', o?.name, `required placeholder="${kind === 'income' ? 'e.g. Rob – salary' : 'e.g. Council tax'}"`))}
      ${field(kind === 'income' ? 'Take-home amount' : 'Amount', moneyInp('amount', o?.amount), kind === 'income' ? 'After tax, NI and pension.' : '')}
      ${fieldDiv('How often', seg('frequency', Object.entries(FIN_FREQ), o?.frequency || 'monthly'), kind === 'out' ? 'Yearly bills are saved for at ÷ 12 a month in the bills pot.' : 'Yearly amounts are spread ÷ 12.')}
      ${field('Category', sel('categoryId', cats.map(c => [c.id, c.label]), defCat))}
      ${kind === 'out' ? fieldDiv('Type', seg('type', Object.entries(FIN_TYPES), defType || 'essential')) : ''}
      ${kind === 'out' ? field('Next payment date (yearly bills)', inp('dueDate', o?.dueDate, 'type="date"'), 'Used to check the bills pot is on track. Leave blank for monthly items.') : ''}
      ${field('Notes', ta('notes', o?.notes, 'placeholder="Optional"'))}`,
    onSubmit: fd => {
      const amount = num(fd.get('amount'));
      if (amount <= 0) { toast('Enter an amount above £0', 'error'); return false; }
      const data = { name: String(fd.get('name') || '').trim(), amount, frequency: fd.get('frequency') === 'yearly' ? 'yearly' : 'monthly', categoryId: fd.get('categoryId'), notes: String(fd.get('notes') || '').trim() };
      if (kind === 'out') { data.type = fd.get('type') === 'discretionary' ? 'discretionary' : 'essential'; data.dueDate = fd.get('dueDate') || ''; }
      const arr = kind === 'income' ? fin().incomes : fin().outgoings;
      const cur = id ? byId(arr, id) : null;
      if (cur) Object.assign(cur, data, { updatedAt: Date.now() }); else arr.push(touch({ id: uid(), ...data }));
      commit(); toast(cur ? 'Saved' : 'Added');
    }
  });
  if (kind === 'out' && !o) {   // new outgoing: default Essential/Discretionary from the chosen category
    const s = $('#modal-form select[name=categoryId]');
    if (s) s.addEventListener('change', () => {
      const c = fin().outCats.find(x => x.id === s.value);
      const r = $(`#modal-form input[name=type][value=${c && c.essential === false ? 'discretionary' : 'essential'}]`);
      if (r) r.checked = true;
    });
  }
}

function finCatsModal(kind) {
  const F = fin();
  const L = kind === 'income' ? F.incomeCats : F.outCats;
  const fallback = kind === 'income' ? 'inc_other' : 'out_other';
  const used = id => (kind === 'income' ? F.incomes : finOutgoings()).filter(o => finCat(kind, o.categoryId).id === id).length;
  openModal({
    title: kind === 'income' ? 'Income categories' : 'Outgoing categories', submitLabel: 'Add category',
    body: `<ul class="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">${L.map((c, i) => `
      <li class="flex items-center gap-2 px-3 py-2">
        <span class="flex-1 min-w-0"><span class="block text-sm font-medium text-slate-800">${esc(c.label)}</span>
          <span class="block text-xs text-slate-500">${used(c.id)} item${used(c.id) === 1 ? '' : 's'}${kind === 'out' ? ' · default ' + (c.essential === false ? 'discretionary' : 'essential') : ''}</span></span>
        <button type="button" data-action="fincat-move" data-kind="${kind}" data-id="${c.id}" data-val="-1" class="${ICON_BTN} !w-8 !h-8" ${i === 0 ? 'disabled style="opacity:.3"' : ''} aria-label="Move up">${icon('arrow-up', 'w-3.5 h-3.5')}</button>
        <button type="button" data-action="fincat-move" data-kind="${kind}" data-id="${c.id}" data-val="1" class="${ICON_BTN} !w-8 !h-8" ${i === L.length - 1 ? 'disabled style="opacity:.3"' : ''} aria-label="Move down">${icon('arrow-down', 'w-3.5 h-3.5')}</button>
        <button type="button" data-action="fincat-edit" data-kind="${kind}" data-id="${c.id}" class="${ICON_BTN} !w-8 !h-8" aria-label="Edit">${icon('pencil', 'w-3.5 h-3.5')}</button>
        ${c.id === fallback ? '<span class="w-8"></span>' : `<button type="button" data-action="fincat-del" data-kind="${kind}" data-id="${c.id}" class="${ICON_BTN} !w-8 !h-8 hover:!text-rose-600" aria-label="Delete">${icon('trash-2', 'w-3.5 h-3.5')}</button>`}
      </li>`).join('')}</ul>
      <div class="rounded-xl bg-slate-50 p-3 space-y-3">${field('New category', inp('newLabel', '', 'placeholder="e.g. Pets"'))}${kind === 'out' ? seg('newType', Object.entries(FIN_TYPES), 'essential') : ''}</div>`,
    onSubmit: fd => {
      const label = String(fd.get('newLabel') || '').trim();
      if (!label) { toast('Type a category name', 'error'); return false; }
      const list = kind === 'income' ? fin().incomeCats : fin().outCats;
      const c = { id: 'fc_' + uid(), label };
      if (kind === 'out') c.essential = fd.get('newType') !== 'discretionary';
      list.splice(Math.max(0, list.length - 1), 0, c);   // keep "Other" last
      commit(); finCatsModal(kind);
    }
  });
}
function finCatEditForm(kind, id) {
  const list = kind === 'income' ? fin().incomeCats : fin().outCats;
  const c = list.find(x => x.id === id); if (!c) return;
  openModal({
    title: 'Edit category',
    body: `${field('Name', inp('label', c.label, 'required'))}${kind === 'out' ? fieldDiv('Default type for new items', seg('etype', Object.entries(FIN_TYPES), c.essential === false ? 'discretionary' : 'essential')) : ''}`,
    onSubmit: fd => {
      const cc = (kind === 'income' ? fin().incomeCats : fin().outCats).find(x => x.id === id); if (!cc) return;
      cc.label = String(fd.get('label') || '').trim() || cc.label;
      if (kind === 'out') cc.essential = fd.get('etype') !== 'discretionary';
      commit(); finCatsModal(kind);
    }
  });
}

function potForm(id) {
  const p = id ? byId(fin().pots, id) : null;
  openModal({
    title: p ? 'Edit savings pot' : 'New savings pot', submitLabel: p ? 'Save' : 'Add pot',
    body: `${field('Name', inp('name', p?.name, 'required placeholder="e.g. Emergency fund, Holiday, House deposit"'))}
      ${fieldDiv('Allocation type', seg('mode', [['fixed', '£ per month'], ['percent', '% of available']], p?.mode || 'fixed'))}
      ${field('Monthly allocation', inp('value', p?.value ?? '', 'inputmode="decimal" placeholder="e.g. 200 (or 10 for 10%)"'), 'A fixed £ amount, or a percentage of what’s available after bills.')}
      <div class="grid grid-cols-2 gap-3">${field('Target (optional)', moneyInp('target', p?.target))}${field('Current balance', moneyInp('balance', p?.balance))}</div>
      ${field('Target date (optional)', inp('targetDate', p?.targetDate, 'type="date"'))}
      ${field('Notes', inp('notes', p?.notes, 'placeholder="e.g. Chase easy-access 4.1%"'))}`,
    onSubmit: fd => {
      const data = { name: String(fd.get('name') || '').trim(), mode: fd.get('mode') === 'percent' ? 'percent' : 'fixed', value: num(fd.get('value')), target: num(fd.get('target')), balance: num(fd.get('balance')), targetDate: fd.get('targetDate') || '', notes: String(fd.get('notes') || '').trim() };
      const cur = id ? byId(fin().pots, id) : null;
      if (cur) Object.assign(cur, data, { updatedAt: Date.now() }); else fin().pots.push(touch({ id: uid(), ...data }));
      commit();
    }
  });
}
function billsPotForm() {
  const b = fin().billsPot;
  openModal({
    title: 'Annual bills pot',
    body: `${field('Pot name', inp('name', b.name, 'required'))}
      ${field('Current balance', moneyInp('balance', b.balance))}
      <p class="text-xs text-slate-500">Every yearly bill is saved for at ÷ 12 a month. “Should hold now” assumes each bill has been saved for since its last payment, using its due date.</p>`,
    onSubmit: fd => { const bb = fin().billsPot; bb.name = String(fd.get('name') || '').trim() || bb.name; bb.balance = num(fd.get('balance')); bb.updatedAt = Date.now(); commit(); }
  });
}

