/* ============================================================
   STATE
============================================================ */
const PALETTE = ['#0F6D66','#E2A33B','#C1502E','#3D5A80','#8AA29E','#5B4B8A','#2E86AB','#EE6C4D','#3E7CB1','#7A9E4E','#B0578D','#4C4C4C'];
let paletteIdx = 0;
function nextColor(){ const c = PALETTE[paletteIdx % PALETTE.length]; paletteIdx++; return c; }

const FONT_OPTIONS = [
  ["Arial, Helvetica, sans-serif", "Arial"],
  ["'Times New Roman', Times, serif", "Times New Roman"],
  ["Georgia, 'Times New Roman', serif", "Georgia"],
  ["'Courier New', Courier, monospace", "Courier New"],
  ["Verdana, Geneva, sans-serif", "Verdana"],
  ["Tahoma, Geneva, sans-serif", "Tahoma"],
  ["'Trebuchet MS', sans-serif", "Trebuchet MS"],
  ["'Palatino Linotype', Palatino, serif", "Palatino"],
  ["Garamond, serif", "Garamond"],
  ["Impact, Charcoal, sans-serif", "Impact"],
  ["'Comic Sans MS', cursive", "Comic Sans MS"],
  ["'IBM Plex Sans', sans-serif", "IBM Plex Sans"],
  ["'IBM Plex Mono', monospace", "IBM Plex Mono"],
];

const CHART_TYPES = [
  {id:'bar', label:'Bar', icon:'bar'},
  {id:'hbar', label:'H-Bar', icon:'hbar'},
  {id:'line', label:'Line', icon:'line'},
  {id:'pie', label:'Pie', icon:'pie'},
  {id:'doughnut', label:'Doughnut', icon:'doughnut'},
  {id:'radar', label:'Radar', icon:'radar'},
  {id:'polarArea', label:'Polar', icon:'polar'},
  {id:'scatter', label:'Scatter', icon:'scatter'},
  {id:'bubble', label:'Bubble', icon:'bubble'},
  {id:'timeline', label:'Timeline', icon:'timeline'},
];

const ICONS = {
  bar:'<svg viewBox="0 0 24 24" stroke-width="2"><path d="M4 20V10M10 20V4M16 20V13M22 20V7" stroke-linecap="round"/></svg>',
  hbar:'<svg viewBox="0 0 24 24" stroke-width="2"><path d="M4 4H14M4 10H20M4 16H10" stroke-linecap="round"/></svg>',
  line:'<svg viewBox="0 0 24 24" stroke-width="2"><path d="M3 17l5-6 4 3 8-9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pie:'<svg viewBox="0 0 24 24" stroke-width="2"><path d="M12 2v10l8 4a10 10 0 1 0-8-14z" stroke-linejoin="round"/></svg>',
  doughnut:'<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/></svg>',
  radar:'<svg viewBox="0 0 24 24" stroke-width="2"><path d="M12 2l9 6-3 10H6L3 8z" stroke-linejoin="round"/></svg>',
  polar:'<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 12L12 3M12 12l7.8 4.5M12 12l-7.8 4.5"/></svg>',
  scatter:'<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="6" cy="16" r="1.4" fill="currentColor"/><circle cx="11" cy="9" r="1.4" fill="currentColor"/><circle cx="16" cy="14" r="1.4" fill="currentColor"/><circle cx="19" cy="6" r="1.4" fill="currentColor"/><path d="M3 20h18" stroke-linecap="round"/></svg>',
  bubble:'<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="8" cy="14" r="3"/><circle cx="16" cy="8" r="4.5"/><circle cx="18" cy="18" r="2"/></svg>',
  timeline:'<svg viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="4" width="9" height="3.2" rx="1"/><rect x="7.5" y="10.4" width="14" height="3.2" rx="1"/><rect x="3" y="16.8" width="11" height="3.2" rx="1"/></svg>',
};

/* ---------- date helpers (used by the timeline chart) ---------- */
function parseDate(s){ return new Date(s + 'T00:00:00'); }
function toISO(d){ return d.toISOString().slice(0,10); }
function daysBetween(a,b){ return Math.round((b - a) / 86400000); }
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDateShort(d){ return MONTH_NAMES[d.getMonth()] + ' ' + d.getDate(); }

function defaultState(){
  return {
    type:'bar',
    labels:['Jan','Feb','Mar','Apr','May'],
    datasets:[
      mkDataset('Series A', [12,19,14,22,18]),
      mkDataset('Series B', [8,13,17,9,15]),
    ],
    activeDsIndex:0,
    title:'', subtitle:'',
    titleSize:20, titleColor:'#182225',
    xAxisTitle:'', yAxisTitle:'',
    showLegend:true, legendPosition:'top',
    gridX:true, gridY:true,
    showDataLabels:false, showTooltip:true,
    fontFamily:FONT_OPTIONS[0][0], baseFontSize:12,
    canvasWidth:760, canvasHeight:460,
    bgColor:'#ffffff', bgTransparent:false,
    padding:16,
    // type specific
    stacked:false, fill:false, tension:0.35, pointStyle:'circle', pointRadius:4,
    cutout:55, borderRadius:4, startAngle:0,
    // timeline (project schedule) specific
    timelineTasks:[],
    timelineShowProgress:true, timelineShowToday:true, timelineSort:true,
  };
}
function seedSampleTimeline(){
  const addDays = (d,n)=> new Date(d.getTime() + n*86400000);
  let cursor = new Date(); cursor.setHours(0,0,0,0);
  const defs = [
    ['Research & discovery', 6, 100],
    ['Design', 8, 60],
    ['Development', 14, 20],
    ['Testing & QA', 6, 0],
    ['Launch', 2, 0],
  ];
  state.timelineTasks = defs.map(([name, len, progress])=>{
    const s = cursor;
    const e = addDays(s, len - 1);
    cursor = addDays(e, 1);
    return { name, start: toISO(s), end: toISO(e), color: nextColor(), progress };
  });
}
function mkDataset(label, data){
  return {
    label, data:data.slice(),
    color:nextColor(),
    borderColor:null,
    borderWidth:2,
    opacity:0.85,
    itemColors:false,
    itemColorList:data.map(()=>nextColor()),
  };
}

let state = defaultState();
let chart = null;

/* ============================================================
   INIT UI (static)
============================================================ */
function populateFontSelect(){
  const sel = document.getElementById('fontFamily');
  sel.innerHTML = FONT_OPTIONS.map(f=>`<option value="${f[0].replace(/"/g,'&quot;')}" style="font-family:${f[0]}">${f[1]}</option>`).join('');
  sel.value = state.fontFamily;
}
function populateTypeGrid(){
  const grid = document.getElementById('typeGrid');
  grid.innerHTML = CHART_TYPES.map(t=>`
    <button class="type-btn ${t.id===state.type?'active':''}" data-type="${t.id}" title="${t.label}">
      ${ICONS[t.icon]}<span>${t.label}</span>
    </button>`).join('');
  grid.querySelectorAll('.type-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.type = btn.dataset.type;
      // scatter/bubble need point-style data; timeline needs task data. Regenerate/seed as needed.
      ensureDataShapeForType();
      populateTypeGrid();
      renderTypeSpecificControls();
      renderDataTable();
      renderDatasetTabs();
      renderDatasetStyleControls();
      refreshDataControlsVisibility();
      update();
    });
  });
}

function refreshDataControlsVisibility(){
  const isTimeline = state.type === 'timeline';
  const addDsBtn = document.getElementById('addDatasetBtn');
  const addRowBtn = document.getElementById('addRowBtn');
  const dsSection = document.getElementById('datasetStylingSection');
  if(addDsBtn) addDsBtn.style.display = isTimeline ? 'none' : '';
  if(addRowBtn) addRowBtn.textContent = isTimeline ? '+ Task' : '+ Row';
  if(dsSection) dsSection.style.display = isTimeline ? 'none' : '';
}

function ensureDataShapeForType(){
  if(state.type === 'timeline'){
    if(!state.timelineTasks || state.timelineTasks.length === 0){ seedSampleTimeline(); }
    return;
  }
  const isXY = (state.type === 'scatter' || state.type === 'bubble');
  state.datasets.forEach(ds=>{
    const currentlyXY = ds.data.length && typeof ds.data[0] === 'object';
    if(isXY && !currentlyXY){
      ds.data = ds.data.map((v,i)=> state.type==='bubble' ? {x:i+1, y:v, r:8} : {x:i+1, y:v});
      ds.itemColorList = ds.data.map(()=>nextColor());
    } else if(!isXY && currentlyXY){
      ds.data = ds.data.map(p=>p.y);
      ds.itemColorList = ds.data.map(()=>nextColor());
    }
  });
}

/* ============================================================
   DATA TABLE
============================================================ */
function renderDataTable(){
  const wrap = document.getElementById('dataTableWrap');

  if(state.type === 'timeline'){
    renderTimelineTable(wrap);
    return;
  }

  const isXY = (state.type === 'scatter' || state.type === 'bubble');

  if(isXY){
    // one block per dataset with x / y / (r) editable rows
    let html = '';
    state.datasets.forEach((ds, di)=>{
      html += `<div style="padding:10px 16px 4px 16px; display:flex; align-items:center; justify-content:space-between;">
        <span class="mono" style="font-size:11px; display:flex; align-items:center; gap:6px;">
          <span class="ds-color-chip" style="background:${ds.color}"></span>${escapeHtml(ds.label)}
        </span>
        ${state.datasets.length>1 ? `<button class="btn-icon" data-rmds="${di}" title="Remove dataset">×</button>` : ''}
      </div>`;
      html += `<table class="datatable" style="margin:0 16px 10px 16px; width:calc(100% - 32px);"><thead><tr>
        <th>X</th><th>Y</th>${state.type==='bubble'?'<th>R</th>':''}<th style="width:22px;"></th>
      </tr></thead><tbody>`;
      ds.data.forEach((p, pi)=>{
        html += `<tr>
          <td><input type="number" data-ds="${di}" data-pi="${pi}" data-field="x" value="${p.x}"></td>
          <td><input type="number" data-ds="${di}" data-pi="${pi}" data-field="y" value="${p.y}"></td>
          ${state.type==='bubble'?`<td><input type="number" data-ds="${di}" data-pi="${pi}" data-field="r" value="${p.r||8}" min="1"></td>`:''}
          <td style="text-align:center;"><button class="rmrow" data-rmpoint="${di}:${pi}">×</button></td>
        </tr>`;
      });
      html += `</tbody></table>
        <div style="padding:0 16px 12px 16px;"><button class="btn btn-sm" data-addpoint="${di}">+ Point</button></div>`;
    });
    wrap.innerHTML = html || '<div class="empty-hint">No datasets yet.</div>';
  } else {
    // shared labels table with a column per dataset
    let html = `<table class="datatable"><thead><tr><th>Label</th>`;
    state.datasets.forEach((ds,di)=>{
      html += `<th><span class="ds-color-chip" style="background:${ds.color}"></span>${escapeHtml(ds.label)}
        ${state.datasets.length>1?`<button class="btn-icon" data-rmds="${di}" style="float:right; width:18px;height:18px;">×</button>`:''}</th>`;
    });
    html += `<th style="width:22px;"></th></tr></thead><tbody>`;
    state.labels.forEach((lab, li)=>{
      html += `<tr><td><input type="text" data-label="${li}" value="${escapeAttr(lab)}"></td>`;
      state.datasets.forEach((ds,di)=>{
        html += `<td><input type="number" data-ds="${di}" data-li="${li}" value="${ds.data[li] ?? 0}"></td>`;
      });
      html += `<td style="text-align:center;"><button class="rmrow" data-rmrow="${li}">×</button></td></tr>`;
    });
    html += `</tbody></table>`;
    wrap.innerHTML = html;
  }
  bindDataTableEvents();
}

function renderTimelineTable(wrap){
  let html = `<table class="datatable"><thead><tr>
    <th>Task</th><th>Start</th><th>End</th><th>Progress %</th><th>Color</th><th style="width:22px;"></th>
  </tr></thead><tbody>`;
  state.timelineTasks.forEach((t, ti)=>{
    html += `<tr>
      <td><input type="text" data-tl="name" data-ti="${ti}" value="${escapeAttr(t.name)}"></td>
      <td><input type="date" data-tl="start" data-ti="${ti}" value="${t.start}"></td>
      <td><input type="date" data-tl="end" data-ti="${ti}" value="${t.end}"></td>
      <td><input type="number" data-tl="progress" data-ti="${ti}" value="${t.progress||0}" min="0" max="100"></td>
      <td class="swatchcell"><input type="color" data-tl="color" data-ti="${ti}" value="${t.color}"></td>
      <td style="text-align:center;"><button class="rmrow" data-rmtask="${ti}">×</button></td>
    </tr>`;
  });
  html += `</tbody></table>`;
  wrap.innerHTML = html || '<div class="empty-hint">No tasks yet — add one below.</div>';

  wrap.querySelectorAll('[data-tl]').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const ti = +inp.dataset.ti;
      const field = inp.dataset.tl;
      let v = inp.value;
      if(field === 'progress') v = parseFloat(v) || 0;
      if((field === 'start' || field === 'end') && !v) return; // ignore cleared dates mid-edit
      state.timelineTasks[ti][field] = v;
      update();
    });
  });
  wrap.querySelectorAll('[data-rmtask]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.timelineTasks.splice(+btn.dataset.rmtask, 1);
      renderDataTable();
      update();
    });
  });
}

function bindDataTableEvents(){
  const wrap = document.getElementById('dataTableWrap');
  wrap.querySelectorAll('input[data-label]').forEach(inp=>{
    inp.addEventListener('input', ()=>{ state.labels[+inp.dataset.label] = inp.value; update(); });
  });
  wrap.querySelectorAll('input[data-ds][data-li]').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      state.datasets[+inp.dataset.ds].data[+inp.dataset.li] = parseFloat(inp.value)||0;
      update();
    });
  });
  wrap.querySelectorAll('input[data-ds][data-pi]').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const ds = state.datasets[+inp.dataset.ds];
      const p = ds.data[+inp.dataset.pi];
      p[inp.dataset.field] = parseFloat(inp.value)||0;
      update();
    });
  });
  wrap.querySelectorAll('[data-rmrow]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const li = +btn.dataset.rmrow;
      state.labels.splice(li,1);
      state.datasets.forEach(ds=>{ ds.data.splice(li,1); ds.itemColorList.splice(li,1); });
      renderDataTable(); update();
    });
  });
  wrap.querySelectorAll('[data-rmpoint]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const [di,pi] = btn.dataset.rmpoint.split(':').map(Number);
      state.datasets[di].data.splice(pi,1);
      state.datasets[di].itemColorList.splice(pi,1);
      renderDataTable(); update();
    });
  });
  wrap.querySelectorAll('[data-addpoint]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const di = +btn.dataset.addpoint;
      const ds = state.datasets[di];
      const nv = state.type==='bubble' ? {x:ds.data.length+1, y:10, r:8} : {x:ds.data.length+1, y:10};
      ds.data.push(nv); ds.itemColorList.push(nextColor());
      renderDataTable(); update();
    });
  });
  wrap.querySelectorAll('[data-rmds]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const di = +btn.dataset.rmds;
      state.datasets.splice(di,1);
      if(state.activeDsIndex>=state.datasets.length) state.activeDsIndex = state.datasets.length-1;
      renderDataTable(); renderDatasetTabs(); renderDatasetStyleControls(); update();
    });
  });
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s){ return escapeHtml(s); }

document.getElementById('addRowBtn').addEventListener('click', ()=>{
  if(state.type === 'timeline'){
    const last = state.timelineTasks[state.timelineTasks.length-1];
    const startBase = last ? new Date(parseDate(last.end).getTime() + 86400000) : new Date();
    const end = new Date(startBase.getTime() + 6*86400000);
    state.timelineTasks.push({ name:'New task', start: toISO(startBase), end: toISO(end), color: nextColor(), progress:0 });
    renderDataTable(); update();
    return;
  }
  const isXY = (state.type === 'scatter' || state.type === 'bubble');
  if(isXY){
    state.datasets.forEach(ds=>{
      const nv = state.type==='bubble' ? {x:ds.data.length+1, y:10, r:8} : {x:ds.data.length+1, y:10};
      ds.data.push(nv); ds.itemColorList.push(nextColor());
    });
  } else {
    state.labels.push('Label ' + (state.labels.length+1));
    state.datasets.forEach(ds=>{ ds.data.push(5); ds.itemColorList.push(nextColor()); });
  }
  renderDataTable(); update();
});

document.getElementById('addDatasetBtn').addEventListener('click', ()=>{
  const isXY = (state.type === 'scatter' || state.type === 'bubble');
  const n = state.datasets.length+1;
  let newDs;
  if(isXY){
    const len = state.labels.length || 5;
    newDs = mkDataset('Series '+String.fromCharCode(64+n), Array.from({length:len},()=>Math.round(Math.random()*20)));
    newDs.data = newDs.data.map((v,i)=> state.type==='bubble'?{x:i+1,y:v,r:8}:{x:i+1,y:v});
  } else {
    if(state.labels.length===0){ state.labels = ['A','B','C','D']; }
    newDs = mkDataset('Series '+String.fromCharCode(64+n), state.labels.map(()=>Math.round(Math.random()*20)+3));
  }
  state.datasets.push(newDs);
  state.activeDsIndex = state.datasets.length-1;
  renderDataTable(); renderDatasetTabs(); renderDatasetStyleControls(); update();
});

document.getElementById('loadSampleBtn').addEventListener('click', ()=>{
  if(state.type === 'timeline'){
    paletteIdx = 0;
    seedSampleTimeline();
    renderDataTable(); update();
    return;
  }
  const isXY = (state.type === 'scatter' || state.type === 'bubble');
  paletteIdx = 0;
  if(isXY){
    state.datasets = [
      mkDataset('Group A', [5,9,14,7,12].map((v,i)=> state.type==='bubble' ? {x:i*2+1,y:v,r:6+i} : {x:i*2+1,y:v})),
      mkDataset('Group B', [8,4,11,15,6].map((v,i)=> state.type==='bubble' ? {x:i*2+2,y:v,r:5+i} : {x:i*2+2,y:v})),
    ];
  } else {
    state.labels = ['Jan','Feb','Mar','Apr','May','Jun'];
    state.datasets = [
      mkDataset('Revenue', [42,55,49,63,58,71]),
      mkDataset('Cost', [30,34,31,38,36,40]),
    ];
  }
  state.activeDsIndex = 0;
  renderDataTable(); renderDatasetTabs(); renderDatasetStyleControls(); update();
});

/* ============================================================
   TYPE-SPECIFIC CONTROLS
============================================================ */
function renderTypeSpecificControls(){
  const box = document.getElementById('typeSpecificControls');
  const t = state.type;
  let html = '';

  if(t==='bar' || t==='hbar'){
    html += fieldToggle('stacked','Stacked bars', state.stacked);
    html += fieldRange('borderRadius','Bar corner radius', state.borderRadius, 0, 30);
  }
  if(t==='line'){
    html += fieldToggle('fill','Fill area under line', state.fill);
    html += fieldRange('tension','Line curve (tension)', state.tension, 0, 1, 0.05);
    html += fieldRange('pointRadius','Point size', state.pointRadius, 0, 12);
    html += fieldSelect('pointStyle','Point style', state.pointStyle, ['circle','rect','rectRounded','triangle','star','cross','crossRot','dash','line']);
  }
  if(t==='radar'){
    html += fieldToggle('fill','Fill area', state.fill);
    html += fieldRange('pointRadius','Point size', state.pointRadius, 0, 12);
  }
  if(t==='doughnut'){
    html += fieldRange('cutout','Cutout (%)', state.cutout, 0, 90);
    html += fieldRange('startAngle','Start angle', state.startAngle, 0, 360);
  }
  if(t==='pie' || t==='polarArea'){
    html += fieldRange('startAngle','Start angle', state.startAngle, 0, 360);
  }
  if(t==='bubble'){
    html += `<p style="font-size:11.5px; color:var(--ink-soft); margin:0;">Edit the R column in the data table to set bubble radius per point.</p>`;
  }
  if(t==='scatter'){
    html += fieldToggle('showLine','Connect points with line', !!state.showLine);
  }
  if(t==='timeline'){
    html += fieldToggle('timelineShowProgress','Show progress overlay', !!state.timelineShowProgress);
    html += fieldToggle('timelineShowToday','Show "today" marker', !!state.timelineShowToday);
    html += fieldToggle('timelineSort','Sort tasks by start date', !!state.timelineSort);
    html += fieldRange('borderRadius','Bar corner radius', state.borderRadius, 0, 20);
  }
  box.innerHTML = html || '<p style="font-size:11.5px;color:var(--ink-soft); margin:0;">No extra options for this chart type.</p>';
  bindTypeSpecificEvents();
}

function fieldToggle(key,label,val){
  return `<div class="toggle-row"><label>${label}</label>
    <label class="switch"><input type="checkbox" data-ts="${key}" ${val?'checked':''}><span class="slider-tog"></span></label></div>`;
}
function fieldRange(key,label,val,min,max,step=1){
  return `<div class="field"><label>${label}</label>
    <input type="range" data-ts="${key}" min="${min}" max="${max}" step="${step}" value="${val}">
    <span class="rangeval" data-tsval="${key}">${val}</span></div>`;
}
function fieldSelect(key,label,val,options){
  return `<div class="field"><label>${label}</label><select data-ts="${key}">
    ${options.map(o=>`<option value="${o}" ${o===val?'selected':''}>${o}</option>`).join('')}
  </select></div>`;
}
function bindTypeSpecificEvents(){
  document.querySelectorAll('[data-ts]').forEach(el=>{
    const key = el.dataset.ts;
    const handler = ()=>{
      if(el.type==='checkbox') state[key] = el.checked;
      else if(el.type==='range') { state[key] = parseFloat(el.value); const disp=document.querySelector(`[data-tsval="${key}"]`); if(disp) disp.textContent = el.value; }
      else state[key] = el.value;
      update();
    };
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
  });
}

/* ============================================================
   DATASET STYLE CONTROLS
============================================================ */
function renderDatasetTabs(){
  const strip = document.getElementById('dsTabStrip');
  strip.innerHTML = state.datasets.map((ds,i)=>`
    <div class="ds-tab ${i===state.activeDsIndex?'active':''}" data-dstab="${i}">
      <span class="dot" style="background:${ds.color}"></span>${escapeHtml(ds.label)}
    </div>`).join('');
  strip.querySelectorAll('[data-dstab]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.activeDsIndex = +el.dataset.dstab;
      renderDatasetTabs(); renderDatasetStyleControls();
    });
  });
}

function renderDatasetStyleControls(){
  const box = document.getElementById('dsStyleControls');
  const ds = state.datasets[state.activeDsIndex];
  if(!ds){ box.innerHTML = '<p style="font-size:11.5px;color:var(--ink-soft);">No dataset selected.</p>'; return; }
  const isPointLike = ['pie','doughnut','polarArea'].includes(state.type);

  box.innerHTML = `
    <div class="field"><label>Dataset name</label><input type="text" id="dsLabelInput" value="${escapeAttr(ds.label)}"></div>
    <div class="row3">
      <div class="field"><label>Fill color</label><input type="color" id="dsColorInput" value="${ds.color}"></div>
      <div class="field"><label>Border color</label><input type="color" id="dsBorderColorInput" value="${ds.borderColor || ds.color}"></div>
      <div class="field"><label>Border width</label><input type="number" id="dsBorderWidthInput" value="${ds.borderWidth}" min="0" max="12"></div>
    </div>
    <div class="field"><label>Opacity</label>
      <input type="range" id="dsOpacityInput" min="0.05" max="1" step="0.05" value="${ds.opacity}">
      <span class="rangeval" id="dsOpacityVal">${Math.round(ds.opacity*100)}%</span>
    </div>
    <div class="toggle-row"><label>Custom color per item</label>
      <label class="switch"><input type="checkbox" id="dsItemColorsToggle" ${ds.itemColors?'checked':''}><span class="slider-tog"></span></label>
    </div>
    <div id="itemColorBox" style="${ds.itemColors?'':'display:none;'} margin-top:6px;">
      <div class="itemcolor-list" id="itemColorList"></div>
    </div>
    ${isPointLike ? `<p style="font-size:11px; color:var(--ink-soft); margin-top:8px;">Tip: per-item color is recommended for ${state.type} charts so every slice gets its own hue.</p>` : ''}
  `;
  renderItemColorList();

  document.getElementById('dsLabelInput').addEventListener('input', e=>{ ds.label = e.target.value; renderDatasetTabs(); renderDataTable(); update(); });
  document.getElementById('dsColorInput').addEventListener('input', e=>{ ds.color = e.target.value; renderDatasetTabs(); renderDataTable(); update(); });
  document.getElementById('dsBorderColorInput').addEventListener('input', e=>{ ds.borderColor = e.target.value; update(); });
  document.getElementById('dsBorderWidthInput').addEventListener('input', e=>{ ds.borderWidth = parseFloat(e.target.value)||0; update(); });
  document.getElementById('dsOpacityInput').addEventListener('input', e=>{
    ds.opacity = parseFloat(e.target.value);
    document.getElementById('dsOpacityVal').textContent = Math.round(ds.opacity*100)+'%';
    update();
  });
  document.getElementById('dsItemColorsToggle').addEventListener('change', e=>{
    ds.itemColors = e.target.checked;
    document.getElementById('itemColorBox').style.display = ds.itemColors ? '' : 'none';
    update();
  });
}
function renderItemColorList(){
  const ds = state.datasets[state.activeDsIndex];
  const list = document.getElementById('itemColorList');
  if(!list) return;
  const n = ds.data.length;
  while(ds.itemColorList.length < n) ds.itemColorList.push(nextColor());
  list.innerHTML = ds.data.map((_,i)=>`
    <div class="itemcolor-item">
      <input type="color" data-itemcolor="${i}" value="${ds.itemColorList[i]}">
      <span>${state.labels[i] || i+1}</span>
    </div>`).join('');
  list.querySelectorAll('[data-itemcolor]').forEach(inp=>{
    inp.addEventListener('input', e=>{
      ds.itemColorList[+inp.dataset.itemcolor] = e.target.value;
      update();
    });
  });
}

/* ============================================================
   GLOBAL CONTROLS BINDING
============================================================ */
function bindGlobalControls(){
  const b = (id, key, transform=(v)=>v, evt='input') => {
    document.getElementById(id).addEventListener(evt, e=>{
      const el = e.target;
      let v = el.type==='checkbox' ? el.checked : el.value;
      state[key] = transform(v);
      update();
    });
  };
  b('chartTitle','title');
  b('chartSubtitle','subtitle');
  b('titleSize','titleSize', v=>parseInt(v)||20);
  b('titleColor','titleColor');
  b('xAxisTitle','xAxisTitle');
  b('yAxisTitle','yAxisTitle');
  b('showLegend','showLegend');
  b('legendPosition','legendPosition');
  b('gridX','gridX');
  b('gridY','gridY');
  b('showDataLabels','showDataLabels');
  b('showTooltip','showTooltip');
  b('canvasWidth','canvasWidth', v=>parseInt(v)||760);
  b('canvasHeight','canvasHeight', v=>parseInt(v)||460);
  b('bgColor','bgColor');
  b('bgTransparent','bgTransparent');

  document.getElementById('chartPadding').addEventListener('input', e=>{
    state.padding = parseInt(e.target.value);
    document.getElementById('chartPaddingVal').textContent = state.padding+'px';
    update();
  });

  document.getElementById('fontFamily').addEventListener('change', e=>{
    state.fontFamily = e.target.value; update();
  });
  document.getElementById('baseFontSize').addEventListener('input', e=>{
    state.baseFontSize = parseInt(e.target.value)||12; update();
  });
}

/* ============================================================
   CHART BUILD
============================================================ */
function withOpacity(hex, opacity){
  if(!hex) return hex;
  hex = hex.replace('#','');
  if(hex.length===3) hex = hex.split('').map(c=>c+c).join('');
  const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), bl = parseInt(hex.substr(4,2),16);
  return `rgba(${r},${g},${bl},${opacity})`;
}

const bgPlugin = {
  id:'customCanvasBackground',
  beforeDraw(chartInstance){
    const {ctx, width, height} = chartInstance;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = state.bgTransparent ? 'rgba(0,0,0,0)' : state.bgColor;
    if(!state.bgTransparent){ ctx.fillRect(0,0,width,height); }
    ctx.restore();
  }
};

function chartJsType(t){
  if(t==='hbar') return 'bar';
  return t;
}

/* ---- timeline (Gantt-style project schedule) extras: progress fill + "today" marker ---- */
const timelinePlugin = {
  id:'timelineExtras',
  afterDatasetsDraw(chartInstance){
    if(state.type !== 'timeline') return;
    const meta = state._timelineMeta;
    if(!meta) return;
    const ctx = chartInstance.ctx;
    const dsMeta = chartInstance.getDatasetMeta(0);

    if(state.timelineShowProgress){
      meta.tasks.forEach((t, i)=>{
        const el = dsMeta.data[i];
        if(!el) return;
        const progress = Math.min(Math.max(parseFloat(t.progress)||0, 0), 100) / 100;
        if(progress <= 0) return;
        const base = el.base, x = el.x, y = el.y, height = el.height || 14;
        const left = Math.min(base, x);
        const full = Math.abs(x - base);
        const w = full * progress;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        const h = height * 0.5;
        ctx.fillRect(left, y - h/2, w, h);
        ctx.restore();
      });
    }

    if(state.timelineShowToday && meta.projectStart){
      const xScale = chartInstance.scales.x;
      if(!xScale) return;
      const todayOffset = daysBetween(meta.projectStart, new Date());
      if(todayOffset >= xScale.min && todayOffset <= xScale.max){
        const xPix = xScale.getPixelForValue(todayOffset);
        ctx.save();
        ctx.strokeStyle = '#C1502E';
        ctx.setLineDash([4,3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xPix, chartInstance.chartArea.top);
        ctx.lineTo(xPix, chartInstance.chartArea.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#C1502E';
        ctx.font = `600 10px ${state.fontFamily}`;
        ctx.fillText('Today', xPix + 4, chartInstance.chartArea.top + 10);
        ctx.restore();
      }
    }
  }
};

function buildTimelineConfig(){
  const font = { family: state.fontFamily, size: state.baseFontSize };
  let tasks = state.timelineTasks.slice();
  if(tasks.length === 0){
    tasks = [{ name:'Add a task to get started', start: toISO(new Date()), end: toISO(new Date(Date.now()+6*86400000)), color:'#0F6D66', progress:0 }];
  }
  if(state.timelineSort){
    tasks = tasks.slice().sort((a,b)=> parseDate(a.start) - parseDate(b.start));
  }
  const projectStart = tasks.reduce((min,t)=>{
    const d = parseDate(t.start);
    return d < min ? d : min;
  }, parseDate(tasks[0].start));

  const ordered = tasks.slice().reverse(); // first task appears at the top of the chart
  const labels = ordered.map(t=>t.name);
  const dataPoints = ordered.map(t=>{
    const s = daysBetween(projectStart, parseDate(t.start));
    const e = daysBetween(projectStart, parseDate(t.end)) + 1;
    return [s, e];
  });
  const colors = ordered.map(t=>t.color);

  state._timelineMeta = { projectStart, tasks: ordered };

  const maxEnd = Math.max.apply(null, dataPoints.map(p=>p[1]).concat([1]));

  return {
    type:'bar',
    data:{
      labels,
      datasets:[{
        label:'Timeline',
        data: dataPoints,
        backgroundColor: colors.map(c=>withOpacity(c, 0.85)),
        borderColor: colors,
        borderWidth: 1.5,
        borderRadius: state.borderRadius || 4,
        barThickness:'flex',
      }],
    },
    options:{
      indexAxis:'y',
      responsive:false,
      animation:false,
      maintainAspectRatio:false,
      layout:{ padding: state.padding },
      font,
      plugins:{
        title:{ display: !!(state.title || state.subtitle), text: state.title, color: state.titleColor, font:{family:state.fontFamily, size:state.titleSize, weight:'600'}, padding:{bottom: state.subtitle?2:10} },
        subtitle:{ display: !!state.subtitle, text: state.subtitle, color: state.titleColor, font:{family:state.fontFamily, size:Math.round(state.titleSize*0.6)}, padding:{bottom:10} },
        legend:{ display: state.showLegend, position: state.legendPosition, labels:{font, color: state.titleColor, usePointStyle:true, boxWidth:10} },
        tooltip:{
          enabled: state.showTooltip, titleFont:font, bodyFont:font,
          callbacks:{
            title:()=> '',
            label:(ctx)=>{
              const t = ordered[ctx.dataIndex];
              if(!t) return '';
              let s = `${t.name}: ${t.start} \u2192 ${t.end}`;
              if(t.progress){ s += ` (${t.progress}% done)`; }
              return s;
            }
          }
        },
        datalabels:{ display:false },
      },
      scales:{
        x:{
          min:0, max:maxEnd,
          title:{ display: !!state.xAxisTitle, text: state.xAxisTitle, font, color: state.titleColor },
          grid:{ display: state.gridX, color:'#E7ECEC' },
          ticks:{ font, color: state.titleColor, callback:(value)=> formatDateShort(new Date(projectStart.getTime() + value*86400000)) },
        },
        y:{
          title:{ display: !!state.yAxisTitle, text: state.yAxisTitle, font, color: state.titleColor },
          grid:{ display: state.gridY, color:'#E7ECEC' },
          ticks:{ font, color: state.titleColor },
        }
      }
    },
    plugins:[bgPlugin, timelinePlugin],
  };
}

function buildDatasets(){
  const isXY = (state.type === 'scatter' || state.type === 'bubble');
  return state.datasets.map(ds=>{
    const baseColor = ds.itemColors ? ds.itemColorList.slice(0, ds.data.length) : ds.color;
    const bg = ds.itemColors
      ? ds.itemColorList.slice(0, ds.data.length).map(c=>withOpacity(c, ds.opacity))
      : withOpacity(ds.color, ds.opacity);
    const border = ds.itemColors
      ? ds.itemColorList.slice(0, ds.data.length)
      : (ds.borderColor || ds.color);

    const common = {
      label: ds.label,
      data: ds.data,
      backgroundColor: bg,
      borderColor: border,
      borderWidth: ds.borderWidth,
    };

    if(state.type==='bar' || state.type==='hbar'){
      common.borderRadius = state.borderRadius;
      common.stack = state.stacked ? 'stack1' : undefined;
    }
    if(state.type==='line'){
      common.fill = state.fill;
      common.tension = state.tension;
      common.pointStyle = state.pointStyle;
      common.pointRadius = state.pointRadius;
      common.pointBackgroundColor = border;
      common.backgroundColor = ds.itemColors ? bg : withOpacity(ds.color, state.fill? ds.opacity*0.35 : ds.opacity);
    }
    if(state.type==='radar'){
      common.fill = state.fill;
      common.pointRadius = state.pointRadius;
      common.backgroundColor = withOpacity(ds.color, state.fill ? ds.opacity*0.35 : ds.opacity);
    }
    if(state.type==='scatter'){
      common.showLine = !!state.showLine;
      common.pointRadius = 5;
    }
    if(state.type==='bubble'){
      // r already embedded in data points
    }
    return common;
  });
}

function buildConfig(){
  if(state.type === 'timeline') return buildTimelineConfig();
  const isXY = (state.type === 'scatter' || state.type === 'bubble');
  const isPointLike = ['pie','doughnut','polarArea'].includes(state.type);
  const font = { family: state.fontFamily, size: state.baseFontSize };

  const plugins = {
    title: {
      display: !!(state.title || state.subtitle),
      text: state.subtitle ? [state.title, ] : state.title,
      color: state.titleColor,
      font: { family: state.fontFamily, size: state.titleSize, weight:'600' },
      padding: {bottom: state.subtitle ? 2 : 10},
    },
    subtitle: {
      display: !!state.subtitle,
      text: state.subtitle,
      color: state.titleColor,
      font: { family: state.fontFamily, size: Math.round(state.titleSize*0.6) },
      padding: {bottom:10},
    },
    legend: {
      display: state.showLegend,
      position: state.legendPosition,
      labels: { font, color: state.titleColor, usePointStyle:true, boxWidth:10 },
    },
    tooltip: { enabled: state.showTooltip, titleFont:font, bodyFont:font },
    datalabels: state.showDataLabels ? {
      display:true, color: '#182225', font: {family: state.fontFamily, size: Math.max(state.baseFontSize-1,8)},
      anchor: isPointLike ? 'end' : 'end', align: isPointLike ? 'start' : 'end',
      formatter:(value)=>{
        if(typeof value === 'object' && value !== null){
          if('r' in value) return value.y;
          return value.y;
        }
        return value;
      }
    } : {display:false},
  };

  const scalesBase = {
    x: {
      display: !isPointLike,
      title: { display: !!state.xAxisTitle, text: state.xAxisTitle, font, color: state.titleColor },
      grid: { display: state.gridX, color:'#E7ECEC' },
      ticks: { font, color: state.titleColor },
      stacked: state.stacked && (state.type==='bar'||state.type==='hbar'),
    },
    y: {
      display: !isPointLike,
      title: { display: !!state.yAxisTitle, text: state.yAxisTitle, font, color: state.titleColor },
      grid: { display: state.gridY, color:'#E7ECEC' },
      ticks: { font, color: state.titleColor },
      stacked: state.stacked && (state.type==='bar'||state.type==='hbar'),
    }
  };

  const config = {
    type: chartJsType(state.type),
    data: {
      labels: isXY ? undefined : state.labels,
      datasets: buildDatasets(),
    },
    options: {
      responsive:false,
      animation:false,
      maintainAspectRatio:false,
      indexAxis: state.type==='hbar' ? 'y' : 'x',
      layout:{ padding: state.padding },
      font,
      plugins,
      scales: isPointLike ? {} : scalesBase,
    },
    plugins:[bgPlugin],
  };

  if(state.type==='doughnut'){
    config.options.cutout = state.cutout + '%';
    config.options.rotation = state.startAngle;
  }
  if(state.type==='pie' || state.type==='polarArea'){
    config.options.rotation = state.startAngle;
  }
  if(state.type==='radar'){
    config.options.scales = {
      r:{
        grid:{ display: state.gridX, color:'#E7ECEC' },
        angleLines:{ display: state.gridX, color:'#E7ECEC' },
        pointLabels:{ font, color: state.titleColor },
        ticks:{ font: {family:state.fontFamily, size:Math.max(state.baseFontSize-2,8)}, backdropColor:'transparent' },
      }
    };
  }
  if(state.type==='polarArea'){
    config.options.scales = {
      r:{
        grid:{ display: state.gridX, color:'#E7ECEC' },
        ticks:{ font: {family:state.fontFamily, size:Math.max(state.baseFontSize-2,8)}, backdropColor:'transparent', color: state.titleColor },
      }
    };
  }

  return config;
}

function showError(err){
  console.error(err);
  const banner = document.getElementById('errorBanner');
  if(!banner) return;
  const msg = (err && err.message) ? err.message : String(err);
  banner.textContent = 'Chartsmith hit a snag and recovered: ' + msg + ' — your last change may not have applied.';
  banner.style.display = 'block';
  clearTimeout(showError._t);
  showError._t = setTimeout(()=>{ banner.style.display = 'none'; }, 6000);
}

function update(){
  try{
    const stage = document.getElementById('chartStage');
    stage.style.width = state.canvasWidth + 'px';
    stage.style.height = state.canvasHeight + 'px';

    const canvas = document.getElementById('mainChart');
    canvas.width = state.canvasWidth;
    canvas.height = state.canvasHeight;
    canvas.style.width = state.canvasWidth + 'px';
    canvas.style.height = state.canvasHeight + 'px';

    const cfg = buildConfig();
    if(chart){ chart.destroy(); }
    chart = new Chart(canvas.getContext('2d'), cfg);
  } catch(err){
    showError(err);
  }
}

/* ============================================================
   EXPORT
============================================================ */
document.getElementById('exportBtn').addEventListener('click', doExport);

function doExport(){
  try{
    doExportInner();
  } catch(err){
    showError(err);
  }
}

function doExportInner(){
  const format = document.getElementById('exportFormat').value;
  const scale = parseInt(document.getElementById('exportScale').value) || 1;

  // Render an offscreen high-res copy for export
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = state.canvasWidth * scale;
  exportCanvas.height = state.canvasHeight * scale;
  const ctx = exportCanvas.getContext('2d');
  ctx.scale(scale, scale);

  const cfg = buildConfig();
  cfg.options.responsive = false;
  cfg.options.animation = false;
  cfg.options.devicePixelRatio = 1;
  const tmpChart = new Chart(ctx, cfg);

  // give Chart.js a tick to finish drawing
  requestAnimationFrame(()=>{
   try{
    if(format === 'pdf'){
      const imgData = exportCanvas.toDataURL('image/png', 1.0);
      const { jsPDF } = window.jspdf;
      const orientation = exportCanvas.width >= exportCanvas.height ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit:'pt', format:[exportCanvas.width/scale, exportCanvas.height/scale] });
      pdf.addImage(imgData, 'PNG', 0, 0, exportCanvas.width/scale, exportCanvas.height/scale);
      pdf.save(fileName('pdf'));
      tmpChart.destroy();
    } else {
      const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      // For jpeg/webp, if background is transparent, force white fill so it isn't black
      if(format !== 'png' && state.bgTransparent){
        const tmpCtx = exportCanvas.getContext('2d');
        tmpCtx.globalCompositeOperation = 'destination-over';
        tmpCtx.fillStyle = '#ffffff';
        tmpCtx.fillRect(0,0,exportCanvas.width, exportCanvas.height);
      }
      exportCanvas.toBlob((blob)=>{
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName(format);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        tmpChart.destroy();
      }, mime, 0.95);
    }
   } catch(err){
     showError(err);
     tmpChart.destroy();
   }
  });
}

function fileName(ext){
  const base = (state.title || 'chartsmith-export').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  return `${base || 'chart'}.${ext}`;
}

/* ============================================================
   GLOBAL SAFETY NET — catches anything unexpected so the tool
   degrades gracefully instead of dying on an uncaught error.
============================================================ */
window.addEventListener('error', function(e){
  showError(e.error || e.message || 'Unexpected error');
});
window.addEventListener('unhandledrejection', function(e){
  showError((e.reason && e.reason.message) ? e.reason.message : 'Unexpected error');
});

/* ============================================================
   BOOT
============================================================ */
try{
  if (typeof Chart !== 'undefined' && window.ChartDataLabels) { Chart.register(window.ChartDataLabels); }

  populateFontSelect();
  populateTypeGrid();
  renderTypeSpecificControls();
  renderDataTable();
  renderDatasetTabs();
  renderDatasetStyleControls();
  refreshDataControlsVisibility();
  bindGlobalControls();
  document.getElementById('baseFontSize').value = state.baseFontSize;
  document.getElementById('chartPaddingVal').textContent = state.padding+'px';
  update();
} catch(err){
  showError(err);
}
