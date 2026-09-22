import {
  AFTER_FILTER_PRESETS,
  ELEMENT_SOURCES,
  ORIGINS,
  PROCESSES,
  SCA_WATER,
  WATERS,
  type ProcessId,
} from '../lib/data';
import {
  computeBrew,
  computeElement,
  defaultRecipe,
  elementLabel,
  newElement,
  newId,
  suggestRatio,
  syncBrew,
  type BrewElement,
  type Recipe,
} from '../lib/calc';
import { NAME_MAX, deleteSaved, getSaved, listSaved, loadDraft, saveDraft, upsertSaved } from '../lib/store';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const num = (el: HTMLInputElement) => {
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : 0;
};
const fmt = (v: number, d = 0) =>
  Number.isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: d }) : '–';
const val = (v: number, unit: string, d = 0) => `${fmt(v, d)}<small>${unit}</small>`;
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const ratioText = (r: number) => `1:${fmt(r, 1)}`;

let r: Recipe = defaultRecipe();
let savedSnapshot = '';

/* ---------- inputs ---------- */
const inp = {
  origin: $<HTMLSelectElement>('origin'),
  originCustom: $<HTMLInputElement>('origin-custom'),
  process: $<HTMLSelectElement>('process'),
  altitude: $<HTMLInputElement>('altitude'),
  ratio: $<HTMLInputElement>('ratio'),
  coffee: $<HTMLInputElement>('coffee'),
  water: $<HTMLInputElement>('water'),
  bloom: $<HTMLInputElement>('bloom'),
  waterType: $<HTMLSelectElement>('water-type'),
  waterName: $<HTMLInputElement>('water-name'),
  waterTds: $<HTMLInputElement>('water-tds'),
  serve: $<HTMLInputElement>('serve'),
  name: $<HTMLInputElement>('r-name'),
};

function fillInputs() {
  inp.origin.value = r.originId;
  inp.originCustom.value = r.originCustom;
  inp.process.value = r.processId;
  inp.altitude.value = r.altitude ? String(r.altitude) : '';
  inp.ratio.value = String(r.ratio);
  inp.coffee.value = String(r.coffeeG);
  inp.water.value = String(r.waterMl);
  inp.bloom.checked = r.bloom;
  inp.waterType.value = r.waterTypeId;
  inp.waterName.value = r.waterCustomName;
  inp.waterTds.value = r.waterCustomTds != null ? String(r.waterCustomTds) : '';
  inp.serve.value = String(r.serveMl);
  inp.name.value = r.name;
  renderElements();
}

/* ---------- bean + ratio ---------- */
function applySuggestion() {
  if (!r.ratioAuto) return;
  r.ratio = suggestRatio(r.processId, r.altitude).ratio;
  inp.ratio.value = String(r.ratio);
  syncBrew(r);
  inp.coffee.value = String(r.coffeeG);
  inp.water.value = String(r.waterMl);
}

function renderBean() {
  const o = ORIGINS.find((x) => x.id === r.originId) ?? ORIGINS[0];
  $('origin-custom-wrap').hidden = o.id !== 'custom';
  inp.altitude.placeholder = String(Math.round((o.altitude[0] + o.altitude[1]) / 2 / 50) * 50);
  const alt = `Typical altitude ${fmt(o.altitude[0])}–${fmt(o.altitude[1])} masl.`;
  $('origin-note').textContent = o.id === 'custom' ? alt : `${o.notes} ${alt}`;

  const s = suggestRatio(r.processId, r.altitude);
  $('suggest-ratio').textContent = ratioText(s.ratio);
  $('suggest-parts').innerHTML = s.parts
    .map(
      (p, i) =>
        `<li><span class="adj">${i === 0 ? fmt(p.adj, 1) : (p.adj > 0 ? '+' : '−') + fmt(Math.abs(p.adj), 1)}</span><span>${esc(p.label)} <span class="why">· ${esc(p.why)}</span></span></li>`,
    )
    .join('');
  const btn = $<HTMLButtonElement>('btn-use-suggested');
  btn.disabled = r.ratioAuto && r.ratio === s.ratio;
  btn.textContent = r.ratioAuto ? 'Following suggestion' : 'Use suggested';
  $('ratio-mode').textContent = r.ratioAuto
    ? 'Ratio follows the suggestion. Type your own ratio to take over.'
    : 'Manual ratio. Changing the bean won’t touch it.';
}

/* ---------- bloom ---------- */
function bloomCall(): string {
  const p = r.processId;
  if (p === 'natural' || p === 'fermented' || p === 'co-fermented')
    return 'Skip it for this bean. Heat on a natural or fermented coffee tends to push boozy, winey notes.';
  if (p === 'wet-hulled' || (r.altitude != null && r.altitude > 0 && r.altitude < 1200))
    return 'Skip it for this bean. Heat is likely to pull more earthy bitterness.';
  if (p === 'honey') return 'Probably not worth it. Honey coffees are already sweet and round in cold water.';
  if (r.altitude != null && r.altitude >= 1800)
    return 'Optional for this bean. It may lift florals and acidity, at the cost of some tea-like smoothness. Try it only if a no-bloom batch tastes flat.';
  return 'Your no-bloom Kintamani batch already tasted like tea. Expect a brighter, less smooth cup with bloom. Worth a side-by-side at most.';
}

/* ---------- water ---------- */
function renderWater() {
  const custom = r.waterTypeId === 'custom';
  $('water-name-wrap').hidden = !custom;
  $('water-tds-wrap').hidden = !custom;
  const w = WATERS.find((x) => x.id === r.waterTypeId)!;
  const tds = custom ? r.waterCustomTds : w.tds;
  const range = `SCA target ${SCA_WATER.tdsTarget} ppm (acceptable ${SCA_WATER.tdsMin}–${SCA_WATER.tdsMax}).`;
  let msg: string;
  if (tds == null) msg = `Add the TDS from the label or a TDS meter to compare. ${range}`;
  else if (tds < SCA_WATER.tdsMin)
    msg = `About ${fmt(tds)} ppm, well below the ${range} Very soft water can taste flat or sharp. A remineralizer packet brings it into range.`;
  else if (tds > SCA_WATER.tdsMax) msg = `${fmt(tds)} ppm is above the ${range} Expect a heavier, duller cup.`;
  else msg = `${fmt(tds)} ppm sits inside the ${range}`;
  $('water-note').textContent = msg;
}

/* ---------- elements ---------- */
function sourceOptions(sel: string) {
  return ELEMENT_SOURCES.map((s) => `<option${s === sel ? ' selected' : ''}>${s}</option>`).join('');
}
const seg = (act: string, cur: string, opts: [string, string][]) =>
  `<div class="seg" role="group">${opts
    .map(([v, l]) => `<button type="button" data-act="${act}" data-v="${v}" aria-pressed="${v === cur}">${l}</button>`)
    .join('')}</div>`;

function elementHtml(e: BrewElement) {
  const presets = AFTER_FILTER_PRESETS[e.kind];
  const unitSeg =
    e.kind === 'juice'
      ? `<div class="el-row"><span class="lbl">Add as</span>${seg('unit', e.duringUnit, [
          ['ml', 'Juice (ml)'],
          ['g', 'Whole fruit (g)'],
        ])}</div>`
      : '';
  const after = `
    <div class="grid">
      <label class="f">Ratio (cold brew : ${e.kind})
        <span class="box"><span class="pre">1 :</span><input type="number" inputmode="decimal" step="1" min="1" data-f="ratio" value="${e.ratio}" /></span>
      </label>
    </div>
    <div class="chips" role="group" aria-label="Ratio presets">${presets
      .map((p) => `<button type="button" class="chip" data-act="preset" data-v="${p.ratio}" aria-pressed="${p.ratio === e.ratio}">${p.label}</button>`)
      .join('')}</div>
    <div class="out pine" data-out>
      <div class="hl"><span>Per serving</span><b data-o="serve">–</b></div>
      <div><span>In teaspoons</span><b data-o="tsp">–</b></div>
      <div><span>For the whole batch</span><b data-o="batch">–</b></div>
    </div>`;
  const unitLbl = e.duringUnit === 'g' ? 'g' : 'ml';
  const during = `
    ${unitSeg}
    <div class="grid">
      <label class="f">Amount into the steep
        <span class="box"><input type="number" inputmode="decimal" step="5" min="0" data-f="duringAmount" value="${e.duringAmount}" /><span class="unit">${unitLbl}</span></span>
      </label>
    </div>
    <div class="out pine" data-out>
      <div class="hl"><span>Into the steep</span><b data-o="total">–</b></div>
      <div><span>Per litre of water</span><b data-o="perl">–</b></div>
    </div>
    <p class="warn">${
      e.duringUnit === 'g'
        ? 'Whole fruit soaks up and releases liquid, so yield is a guess. Keep it refrigerated the whole steep and drink within 3 days.'
        : 'Counts as liquid, so it dilutes the brew. Keep it refrigerated the whole steep and drink within 3 days.'
    }</p>`;
  return `
  <div class="el" data-id="${e.id}">
    <div class="el-head">
      <h3 data-o="title">${esc(elementLabel(e))}</h3>
      <button type="button" class="btn ghost danger" data-act="remove">Remove</button>
    </div>
    <div class="el-row"><span class="lbl">Type</span>${seg('kind', e.kind, [
      ['juice', 'Juice'],
      ['syrup', 'Syrup'],
    ])}</div>
    <div class="grid">
      <label class="f">Made from
        <span class="box"><select data-f="source">${sourceOptions(e.source)}</select></span>
      </label>
      <label class="f"${e.source === 'Other' ? '' : ' hidden'} data-custom>Name
        <span class="box"><input type="text" maxlength="30" data-f="sourceCustom" value="${esc(e.sourceCustom)}" placeholder="e.g. Salak" /></span>
      </label>
    </div>
    <div class="el-row"><span class="lbl">When</span>${seg('timing', e.timing, [
      ['after', 'After filtering'],
      ['during', 'During the steep'],
    ])}</div>
    ${e.timing === 'after' ? after : during}
  </div>`;
}

function renderElements() {
  $('elements').innerHTML = r.elements.map(elementHtml).join('');
  $('elements-empty').hidden = r.elements.length > 0;
}

function renderElementOutputs(yieldMl: number) {
  for (const e of r.elements) {
    const el = document.querySelector<HTMLElement>(`.el[data-id="${e.id}"]`);
    if (!el) continue;
    const o = (k: string) => el.querySelector<HTMLElement>(`[data-o="${k}"]`);
    o('title')!.textContent = elementLabel(e);
    const c = computeElement(e, r, yieldMl);
    if (e.timing === 'after') {
      o('serve')!.innerHTML = val(c.perServe, 'ml', 1);
      o('tsp')!.innerHTML = val(c.perServe / 5, 'tsp', 1);
      o('batch')!.innerHTML = val(c.perBatch, 'ml');
      el.querySelectorAll<HTMLElement>('[data-act="preset"]').forEach((b) =>
        b.setAttribute('aria-pressed', String(Number(b.dataset.v) === e.ratio)),
      );
    } else {
      const u = e.duringUnit;
      o('total')!.innerHTML = val(e.duringAmount, u);
      o('perl')!.innerHTML = val(c.perLitre, `${u}/L`);
    }
  }
  $('serve-wrap').hidden = !r.elements.some((e) => e.timing === 'after');
  document.querySelectorAll<HTMLElement>('[data-serve]').forEach((b) =>
    b.setAttribute('aria-pressed', String(Number(b.dataset.serve) === r.serveMl)),
  );
}

/* ---------- brew outputs + steps ---------- */
function renderBrew() {
  $('b-coffee').classList.toggle('anchor', r.anchor === 'coffee');
  $('b-water').classList.toggle('anchor', r.anchor === 'water');
  const b = computeBrew(r);
  $('o-bloom-wrap').hidden = !r.bloom;
  $('o-bloom').innerHTML = val(b.bloomMl, 'ml');
  $('o-rest-label').textContent = r.bloom ? 'Then room-temp water' : 'Room-temp water';
  $('o-rest').innerHTML = val(b.restMl, 'ml');
  $('o-absorbed').innerHTML = val(b.absorbedMl, 'ml');
  $('o-yield').innerHTML = val(b.yieldMl, 'ml');

  const warn = $('bloom-warn');
  warn.hidden = !r.bloom;
  if (r.bloom) warn.textContent = bloomCall();

  const eff = $('effective-ratio');
  eff.hidden = b.duringLiquidMl <= 0;
  if (b.duringLiquidMl > 0)
    eff.innerHTML = `Liquid added during the steep (${fmt(b.duringLiquidMl)} ml) makes the effective ratio <span class="mono">${ratioText(b.effectiveRatio)}</span>, not ${ratioText(r.ratio)}.`;

  const during = r.elements.filter((e) => e.timing === 'during');
  const after = r.elements.filter((e) => e.timing === 'after');
  const steps: string[] = [`Grind <span class="mono">${fmt(r.coffeeG, 1)} g</span> coarse (your V60 setting +1 on the ZP6S).`];
  if (r.bloom) {
    steps.push(`Bloom with <span class="mono">${fmt(b.bloomMl)} ml</span> water at 90°C. Stir and wait 1 minute.`);
    steps.push(`Add <span class="mono">${fmt(b.restMl)} ml</span> room-temp water.`);
  } else {
    steps.push(`Pour <span class="mono">${fmt(r.waterMl)} ml</span> room-temp water and stir until all the grounds are wet.`);
  }
  for (const e of during)
    steps.push(`Add <span class="mono">${fmt(e.duringAmount)} ${e.duringUnit}</span> ${esc(elementLabel(e).toLowerCase())}${e.duringUnit === 'g' ? ' (whole fruit)' : ''}.`);
  steps.push('Cover and refrigerate for 12–14 hours.');
  steps.push(`Filter through a mesh, then again through a V60 paper. Expect about <span class="mono">${fmt(b.yieldMl)} ml</span>.`);
  if (after.length) {
    const adds = after
      .map((e) => `<span class="mono">${fmt(r.serveMl / e.ratio, 1)} ml</span> ${esc(elementLabel(e).toLowerCase())}`)
      .join(' + ');
    steps.push(`Per glass: <span class="mono">${fmt(r.serveMl)} ml</span> cold brew + ${adds}. Pinch of salt optional.`);
  }
  $('steps').innerHTML = steps.map((s) => `<li>${s}</li>`).join('');
  return b;
}

/* ---------- save state ---------- */
const snapshot = () => JSON.stringify({ ...r, updatedAt: 0, name: r.name.trim() });

function renderSaveState() {
  $('name-count').textContent = `${r.name.length}/${NAME_MAX}`;
  const editing = r.id != null;
  $('editing').hidden = !editing;
  $('editing-name').textContent = editing ? savedName() : '';
  $<HTMLButtonElement>('btn-save').textContent = editing ? 'Update' : 'Save';
  $('btn-save-new').hidden = !editing;
  if (editing) {
    const dirty = snapshot() !== savedSnapshot;
    const st = $('save-status');
    if (dirty && !st.dataset.sticky) st.textContent = 'Unsaved changes.';
    if (!dirty && !st.dataset.sticky) st.textContent = 'All changes saved.';
  }
  $('saved-count').textContent = String(listSaved().length);
}
function savedName() {
  return r.id ? getSaved(r.id)?.name ?? r.name : r.name;
}
function flash(msg: string) {
  const st = $('save-status');
  st.textContent = msg;
  st.dataset.sticky = '1';
  window.setTimeout(() => {
    delete st.dataset.sticky;
    renderSaveState();
  }, 2500);
}

/* ---------- master update ---------- */
function update() {
  renderBean();
  const b = renderBrew();
  renderWater();
  renderElementOutputs(b.yieldMl);
  renderSaveState();
  saveDraft(r);
}

/* ---------- events: bean ---------- */
inp.origin.addEventListener('change', () => {
  r.originId = inp.origin.value;
  const o = ORIGINS.find((x) => x.id === r.originId)!;
  if (o.id !== 'custom') {
    r.processId = o.typicalProcess;
    r.altitude = Math.round((o.altitude[0] + o.altitude[1]) / 2 / 50) * 50;
    inp.process.value = r.processId;
    inp.altitude.value = String(r.altitude);
  }
  applySuggestion();
  update();
});
inp.originCustom.addEventListener('input', () => {
  r.originCustom = inp.originCustom.value;
  update();
});
inp.process.addEventListener('change', () => {
  r.processId = inp.process.value as ProcessId | '';
  applySuggestion();
  update();
});
inp.altitude.addEventListener('input', () => {
  const v = num(inp.altitude);
  r.altitude = v > 0 ? v : null;
  applySuggestion();
  update();
});
$('btn-use-suggested').addEventListener('click', () => {
  r.ratioAuto = true;
  applySuggestion();
  update();
});

/* ---------- events: brew ---------- */
inp.ratio.addEventListener('input', () => {
  r.ratio = num(inp.ratio);
  r.ratioAuto = false;
  syncBrew(r);
  if (r.anchor === 'coffee') inp.water.value = String(r.waterMl);
  else inp.coffee.value = String(r.coffeeG);
  update();
});
inp.coffee.addEventListener('input', () => {
  r.anchor = 'coffee';
  r.coffeeG = num(inp.coffee);
  syncBrew(r);
  inp.water.value = String(r.waterMl);
  update();
});
inp.water.addEventListener('input', () => {
  r.anchor = 'water';
  r.waterMl = num(inp.water);
  syncBrew(r);
  inp.coffee.value = String(r.coffeeG);
  update();
});
inp.bloom.addEventListener('change', () => {
  r.bloom = inp.bloom.checked;
  update();
});

/* ---------- events: water ---------- */
inp.waterType.addEventListener('change', () => {
  r.waterTypeId = inp.waterType.value;
  update();
});
inp.waterName.addEventListener('input', () => {
  r.waterCustomName = inp.waterName.value;
  update();
});
inp.waterTds.addEventListener('input', () => {
  r.waterCustomTds = inp.waterTds.value === '' ? null : num(inp.waterTds);
  update();
});

/* ---------- events: elements ---------- */
$('btn-add-element').addEventListener('click', () => {
  const e = newElement();
  r.elements.push(e);
  renderElements();
  update();
  document.querySelector<HTMLElement>(`.el[data-id="${e.id}"] select`)?.focus();
});
inp.serve.addEventListener('input', () => {
  r.serveMl = num(inp.serve);
  update();
});
document.querySelectorAll<HTMLElement>('[data-serve]').forEach((b) =>
  b.addEventListener('click', () => {
    r.serveMl = Number(b.dataset.serve);
    inp.serve.value = String(r.serveMl);
    update();
  }),
);

const list = $('elements');
const findEl = (t: HTMLElement) => {
  const box = t.closest<HTMLElement>('.el');
  return box ? r.elements.find((x) => x.id === box.dataset.id) : undefined;
};
list.addEventListener('click', (ev) => {
  const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!t) return;
  const e = findEl(t);
  if (!e) return;
  const v = t.dataset.v ?? '';
  switch (t.dataset.act) {
    case 'remove':
      r.elements = r.elements.filter((x) => x !== e);
      break;
    case 'kind':
      if (e.kind === v) return;
      e.kind = v as BrewElement['kind'];
      e.ratio = e.kind === 'syrup' ? 15 : 8;
      if (e.kind === 'syrup') e.duringUnit = 'ml';
      break;
    case 'timing':
      e.timing = v as BrewElement['timing'];
      break;
    case 'unit':
      e.duringUnit = v as BrewElement['duringUnit'];
      break;
    case 'preset':
      e.ratio = Number(v);
      el(t, 'ratio').value = v;
      update();
      return;
  }
  renderElements();
  update();
});
const el = (t: HTMLElement, f: string) =>
  t.closest('.el')!.querySelector<HTMLInputElement>(`[data-f="${f}"]`)!;
list.addEventListener('input', (ev) => {
  const t = ev.target as HTMLInputElement;
  const e = findEl(t);
  if (!e || !t.dataset.f) return;
  if (t.dataset.f === 'ratio') e.ratio = num(t);
  if (t.dataset.f === 'duringAmount') e.duringAmount = num(t);
  if (t.dataset.f === 'sourceCustom') e.sourceCustom = t.value;
  update();
});
list.addEventListener('change', (ev) => {
  const t = ev.target as HTMLSelectElement;
  const e = findEl(t);
  if (!e || t.dataset.f !== 'source') return;
  e.source = t.value;
  const box = t.closest('.el')!.querySelector<HTMLElement>('[data-custom]')!;
  box.hidden = e.source !== 'Other';
  update();
});

/* ---------- events: save ---------- */
inp.name.addEventListener('input', () => {
  r.name = inp.name.value.slice(0, NAME_MAX);
  update();
});
function doSave(asNew: boolean) {
  const name = r.name.trim();
  if (!name) {
    flash('Name the recipe first.');
    inp.name.focus();
    return;
  }
  if (asNew || !r.id) r.id = newId();
  r.name = name;
  r.updatedAt = Date.now();
  if (!upsertSaved(structuredClone(r))) {
    flash('Couldn’t save. This browser is blocking storage.');
    return;
  }
  savedSnapshot = snapshot();
  inp.name.value = r.name;
  history.replaceState(null, '', `#r/${r.id}`);
  update();
  flash(asNew ? `Saved a copy as “${name}”.` : `Saved “${name}”.`);
}
$('btn-save').addEventListener('click', () => doSave(false));
$('btn-save-new').addEventListener('click', () => doSave(true));
$('btn-new').addEventListener('click', () => {
  r = defaultRecipe();
  savedSnapshot = '';
  history.replaceState(null, '', location.pathname + location.search);
  fillInputs();
  update();
  $('save-status').textContent = '';
  window.scrollTo({ top: 0 });
});

/* ---------- saved view ---------- */
function describe(x: Recipe) {
  const o = ORIGINS.find((i) => i.id === x.originId);
  const origin = x.originId === 'custom' ? x.originCustom || 'Custom origin' : o?.name ?? x.originId;
  const p = PROCESSES.find((i) => i.id === x.processId)?.name;
  return [origin, p, x.altitude ? `${fmt(x.altitude)} masl` : ''].filter(Boolean).join(' · ');
}
function renderSaved() {
  const all = listSaved();
  $('saved-empty').hidden = all.length > 0;
  $('saved-list').innerHTML = all
    .map((x) => {
      const b = computeBrew(x);
      const els = x.elements.length ? ` · ${x.elements.map(elementLabel).join(', ')}` : '';
      const d = new Date(x.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return `<li data-id="${x.id}">
        <button type="button" class="open" data-act="open">
          <span class="nm">${esc(x.name)}</span>
          <span class="meta">${esc(describe(x))}</span>
          <span class="nums">${fmt(x.coffeeG, 1)} g · ${ratioText(x.ratio)} · ${fmt(x.waterMl)} ml → ${fmt(b.yieldMl)} ml${esc(els)}</span>
          <span class="meta">Updated ${d}</span>
        </button>
        <div class="actions">
          <button type="button" class="btn" data-act="open">Open</button>
          <button type="button" class="btn ghost danger" data-act="delete">Delete</button>
        </div>
      </li>`;
    })
    .join('');
  $('saved-count').textContent = String(all.length);
}
$('saved-list').addEventListener('click', (ev) => {
  const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
  const li = t?.closest<HTMLElement>('li');
  if (!t || !li) return;
  const id = li.dataset.id!;
  if (t.dataset.act === 'open') {
    location.hash = `#r/${id}`;
  } else if (t.dataset.act === 'delete') {
    if (t.dataset.confirm) {
      deleteSaved(id);
      if (r.id === id) {
        r.id = null;
        savedSnapshot = '';
      }
      renderSaved();
      renderSaveState();
    } else {
      t.dataset.confirm = '1';
      t.textContent = 'Tap again to delete';
      t.addEventListener('blur', () => {
        delete t.dataset.confirm;
        t.textContent = 'Delete';
      }, { once: true });
    }
  }
});

/* ---------- routing ---------- */
function showView(view: 'calc' | 'saved') {
  $('view-calc').hidden = view !== 'calc';
  $('view-saved').hidden = view !== 'saved';
  document.querySelector('.savebar')!.toggleAttribute('hidden', view !== 'calc');
  document.querySelectorAll<HTMLElement>('.tab').forEach((t) => {
    if (t.dataset.view === view) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  });
  if (view === 'saved') renderSaved();
}
document.querySelectorAll<HTMLElement>('.tab').forEach((t) =>
  t.addEventListener('click', () => {
    if (t.dataset.view === 'saved') location.hash = '#saved';
    else location.hash = r.id ? `#r/${r.id}` : '#calc';
  }),
);

function route() {
  const h = location.hash;
  if (h === '#saved') return showView('saved');
  const m = h.match(/^#r\/([a-z0-9]+)$/);
  if (m) {
    const found = getSaved(m[1]);
    if (found && found.id !== r.id) {
      r = structuredClone(found);
      savedSnapshot = snapshot();
      fillInputs();
      $('save-status').textContent = '';
    }
    // Same recipe as the one on screen: keep any unsaved edits.
    window.scrollTo({ top: 0 });
  }
  showView('calc');
  update();
}
window.addEventListener('hashchange', route);

/* ---------- boot ---------- */
const draft = loadDraft();
if (draft) {
  r = { ...defaultRecipe(), ...draft };
  if (r.id) {
    const s = getSaved(r.id);
    savedSnapshot = s ? JSON.stringify({ ...s, updatedAt: 0, name: s.name.trim() }) : '';
    if (!s) r.id = null;
  }
}
fillInputs();
route();
