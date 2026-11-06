(function(){
"use strict";

/* ============ Config ============ */
const ROW_H = 27, HEAD_H = 34, DOT_R = 5;
const PALETTE = ['#2E3A59','#3F6C51','#7A4B3A','#5B4B7A','#8A6A2F','#2F6E6E','#7A3F55','#4A4F58'];
const TYPES = ['INT','BIGINT','SMALLINT','SERIAL','VARCHAR(255)','TEXT','CHAR(1)','BOOLEAN',
  'DATE','DATETIME','TIMESTAMP','FLOAT','DOUBLE','DECIMAL(10,2)','UUID','JSON','ENUM','BLOB'];
const CARD_OPTS = [
  {v:'one', label:'One (—|)'},
  {v:'many', label:'Many (—<)'},
  {v:'one-only', label:'One and only one (—||)'},
  {v:'zero-one', label:'Zero or one (—o|)'},
  {v:'one-many', label:'One or many (—|<)'},
  {v:'zero-many', label:'Zero or many (—o<)'}
];

let uidCounter = 1;
function uid(prefix){ return prefix + (uidCounter++); }

/* ============ State ============ */
let state = null;

function freshState(){
  return {
    settings:{ lineStyle:'curved', grid:'grid', theme:'light' },
    tables:[],
    relationships:[],
    selection:null // {type:'table'|'rel', id}
  };
}

function sampleState(){
  const s = freshState();
  const users = { id: uid('t'), name:'users', x:120, y:100, width:220, color:PALETTE[0],
    fields:[
      {id:uid('f'), name:'id', type:'UUID', pk:true, fk:false, nn:true, uq:false},
      {id:uid('f'), name:'email', type:'VARCHAR(255)', pk:false, fk:false, nn:true, uq:true},
      {id:uid('f'), name:'name', type:'VARCHAR(255)', pk:false, fk:false, nn:false, uq:false},
      {id:uid('f'), name:'created_at', type:'TIMESTAMP', pk:false, fk:false, nn:true, uq:false},
    ]};
  const posts = { id: uid('t'), name:'posts', x:520, y:80, width:220, color:PALETTE[5],
    fields:[
      {id:uid('f'), name:'id', type:'UUID', pk:true, fk:false, nn:true, uq:false},
      {id:uid('f'), name:'user_id', type:'UUID', pk:false, fk:true, nn:true, uq:false},
      {id:uid('f'), name:'title', type:'VARCHAR(255)', pk:false, fk:false, nn:true, uq:false},
      {id:uid('f'), name:'body', type:'TEXT', pk:false, fk:false, nn:false, uq:false},
    ]};
  const comments = { id: uid('t'), name:'comments', x:520, y:380, width:220, color:PALETTE[4],
    fields:[
      {id:uid('f'), name:'id', type:'UUID', pk:true, fk:false, nn:true, uq:false},
      {id:uid('f'), name:'post_id', type:'UUID', pk:false, fk:true, nn:true, uq:false},
      {id:uid('f'), name:'user_id', type:'UUID', pk:false, fk:true, nn:true, uq:false},
      {id:uid('f'), name:'body', type:'TEXT', pk:false, fk:false, nn:true, uq:false},
    ]};
  s.tables.push(users, posts, comments);
  s.relationships.push(
    {id:uid('r'), fromTable:users.id, fromField:users.fields[0].id, toTable:posts.id, toField:posts.fields[1].id,
     cardFrom:'one', cardTo:'many', label:''},
    {id:uid('r'), fromTable:posts.id, fromField:posts.fields[0].id, toTable:comments.id, toField:comments.fields[1].id,
     cardFrom:'one', cardTo:'many', label:''},
    {id:uid('r'), fromTable:users.id, fromField:users.fields[0].id, toTable:comments.id, toField:comments.fields[2].id,
     cardFrom:'one', cardTo:'many', label:''}
  );
  return s;
}

/* ============ DOM refs ============ */
const wrapper = document.getElementById('canvasWrapper');
const world = document.getElementById('world');
const svg = document.getElementById('relLayer');
const tablesLayer = document.getElementById('tablesLayer');
const inspector = document.getElementById('inspector');
const diagramTitle = document.getElementById('diagramTitle');
const toastEl = document.getElementById('toast');

let view = { x: 60, y: 40, scale: 1 };
let connectMode = false;
let pendingConnect = null; // {tableId, fieldId, side}
let dragCtx = null; // active drag context

/* ============ Utility ============ */
function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>toastEl.classList.remove('show'), 1600);
}
function getTable(id){ return state.tables.find(t=>t.id===id); }
function getField(table, id){ return table.fields.find(f=>f.id===id); }
function tableHeight(t){ return HEAD_H + t.fields.length*ROW_H + 30; }
function applyView(){
  world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.scale})`;
  document.getElementById('zoomLabel').textContent = Math.round(view.scale*100)+'%';
}
function screenToWorld(sx, sy){
  const r = wrapper.getBoundingClientRect();
  return { x:(sx - r.left - view.x)/view.scale, y:(sy - r.top - view.y)/view.scale };
}

/* ============ Rendering ============ */
function fullRender(){
  renderTables();
  renderRelationships();
  renderInspector();
  applyGridStyle();
}

function applyGridStyle(){
  world.classList.remove('dots-bg','plain-bg');
  if(state.settings.grid==='dots') world.classList.add('dots-bg');
  else if(state.settings.grid==='plain') world.classList.add('plain-bg');
}

function renderTables(){
  tablesLayer.innerHTML = '';
  state.tables.forEach(t => tablesLayer.appendChild(buildTableNode(t)));
  if(connectMode) setDotsActive(true);
}

function fieldRowHtml(t, f){
  return `
  <div class="field-row" data-field-id="${f.id}">
    <span class="dot left" data-table="${t.id}" data-field="${f.id}" data-side="left"></span>
    <span class="flags">
      <span class="flag ${f.pk?'on pk':''}" data-flag="pk" title="Primary key">PK</span>
      <span class="flag ${f.fk?'on fk':''}" data-flag="fk" title="Foreign key">FK</span>
      <span class="flag ${f.nn?'on':''}" data-flag="nn" title="Not null">NN</span>
      <span class="flag ${f.uq?'on':''}" data-flag="uq" title="Unique">UQ</span>
    </span>
    <input class="fname" value="${escapeAttr(f.name)}" spellcheck="false">
    <input class="ftype" value="${escapeAttr(f.type)}" list="typeList" spellcheck="false">
    <button class="fdel" title="Delete field">×</button>
    <span class="dot right" data-table="${t.id}" data-field="${f.id}" data-side="right"></span>
  </div>`;
}

function buildTableNode(t){
  const div = document.createElement('div');
  div.className = 'tbl' + (state.selection && state.selection.type==='table' && state.selection.id===t.id ? ' selected':'');
  div.style.left = t.x+'px'; div.style.top = t.y+'px'; div.style.width = t.width+'px';
  div.dataset.tableId = t.id;
  div.innerHTML = `
    <div class="tbl-head" style="background:${t.color}">
      <input value="${escapeAttr(t.name)}" spellcheck="false">
    </div>
    <div class="tbl-body">
      ${t.fields.map(f=>fieldRowHtml(t,f)).join('')}
      <button class="addfield">+ Add field</button>
    </div>
    <div class="tbl-resize"></div>
  `;
  attachTableEvents(div, t);
  return div;
}

function escapeAttr(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

/* ---------- Table interactivity ---------- */
function attachTableEvents(div, t){
  const head = div.querySelector('.tbl-head');
  const nameInput = head.querySelector('input');

  // select on mousedown (not drag)
  let moved = false, startSX=0, startSY=0, startTX=0, startTY=0;

  head.addEventListener('mousedown', e=>{
    if(connectMode) return;
    if(e.target.tagName==='INPUT') return;
    e.stopPropagation();
    moved = false;
    startSX = e.clientX; startSY = e.clientY;
    startTX = t.x; startTY = t.y;
    dragCtx = {type:'table', id:t.id};
    function onMove(ev){
      const dx = (ev.clientX-startSX)/view.scale, dy=(ev.clientY-startSY)/view.scale;
      if(Math.abs(dx)>2||Math.abs(dy)>2) moved = true;
      t.x = Math.max(0, startTX+dx); t.y = Math.max(0, startTY+dy);
      div.style.left = t.x+'px'; div.style.top = t.y+'px';
      updateAllPaths();
    }
    function onUp(){
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      dragCtx = null;
      if(!moved){ selectItem('table', t.id); }
      persist();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  nameInput.addEventListener('mousedown', e=>e.stopPropagation());
  nameInput.addEventListener('blur', ()=>{ t.name = nameInput.value.trim()||t.name; renderInspector(); persist(); });
  nameInput.addEventListener('keydown', e=>{ if(e.key==='Enter') nameInput.blur(); });

  div.addEventListener('mousedown', e=>{ if(!connectMode) e.stopPropagation(); });

  // field rows
  div.querySelectorAll('.field-row').forEach(row=>{
    const fid = row.dataset.fieldId;
    const f = getField(t, fid);
    const fname = row.querySelector('.fname');
    const ftype = row.querySelector('.ftype');
    fname.addEventListener('blur', ()=>{ f.name = fname.value.trim()||f.name; persist(); syncTableHeightOnly(t); });
    ftype.addEventListener('blur', ()=>{ f.type = ftype.value.trim()||f.type; persist(); });
    [fname,ftype].forEach(inp=>{
      inp.addEventListener('keydown', e=>{ if(e.key==='Enter') inp.blur(); });
      inp.addEventListener('mousedown', e=>e.stopPropagation());
    });
    row.querySelectorAll('.flag').forEach(chip=>{
      chip.addEventListener('mousedown', e=>e.stopPropagation());
      chip.addEventListener('click', ()=>{
        const key = chip.dataset.flag;
        f[key] = !f[key];
        chip.classList.toggle('on');
        persist();
      });
    });
    row.querySelector('.fdel').addEventListener('mousedown', e=>e.stopPropagation());
    row.querySelector('.fdel').addEventListener('click', ()=>{
      t.fields = t.fields.filter(x=>x.id!==fid);
      state.relationships = state.relationships.filter(r=> !(r.fromField===fid || r.toField===fid));
      fullRender(); persist();
    });
    // connector dots
    row.querySelectorAll('.dot').forEach(dot=>{
      dot.addEventListener('mousedown', e=>{
        e.stopPropagation(); e.preventDefault();
        startConnectorDrag(t.id, fid, dot.dataset.side, e);
      });
    });
  });

  div.querySelector('.addfield').addEventListener('mousedown', e=>e.stopPropagation());
  div.querySelector('.addfield').addEventListener('click', ()=>{
    t.fields.push({id:uid('f'), name:'new_field', type:'VARCHAR(255)', pk:false, fk:false, nn:false, uq:false});
    fullRender(); persist();
  });

  // resize handle
  const resize = div.querySelector('.tbl-resize');
  resize.addEventListener('mousedown', e=>{
    if(connectMode) return; // don't let a resize drag start while wiring up relationships
    e.stopPropagation(); e.preventDefault();
    const startX = e.clientX, startW = t.width;
    function onMove(ev){
      t.width = Math.max(160, startW + (ev.clientX-startX)/view.scale);
      div.style.width = t.width+'px';
      updateAllPaths();
    }
    function onUp(){ document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); persist(); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  resize.classList.toggle('resize-disabled', connectMode);
}

function syncTableHeightOnly(){ /* heights are computed on demand; nothing to precompute */ }

/* ---------- Connector dot geometry ---------- */
function dotWorldPos(t, fieldId, side){
  const idx = t.fields.findIndex(f=>f.id===fieldId);
  const y = t.y + HEAD_H + idx*ROW_H + ROW_H/2;
  const x = side==='left' ? t.x : t.x + t.width;
  return {x,y};
}

/* ---------- Connections (create relationship) ---------- */
let activeConnectCancel = null;
const canvasHint = document.getElementById('canvasHint');
function showCanvasHint(msg){ canvasHint.textContent = msg; canvasHint.classList.add('show'); }
function hideCanvasHint(){ canvasHint.classList.remove('show'); }

function setDotsActive(on){
  document.querySelectorAll('.dot').forEach(d=>d.classList.toggle('connect-active', on));
}

function clearDropHighlights(){
  document.querySelectorAll('.dot.drop-target, .dot.drop-reject').forEach(d=>d.classList.remove('drop-target','drop-reject'));
}

function startConnectorDrag(tableId, fieldId, side, e){
  pendingConnect = {tableId, fieldId, side};
  wrapper.classList.add('connecting');
  document.querySelectorAll('.tbl-resize').forEach(r=>r.classList.add('resize-disabled'));
  showCanvasHint('Drag to a field on another table, release to connect · Esc to cancel');
  const tempPath = document.createElementNS('http://www.w3.org/2000/svg','path');
  tempPath.setAttribute('stroke', 'var(--accent)');
  tempPath.setAttribute('stroke-width','2');
  tempPath.setAttribute('fill','none');
  tempPath.setAttribute('stroke-dasharray','5,4');
  svg.appendChild(tempPath);

  let lastDot = null;
  function onMove(ev){
    const t = getTable(tableId);
    const p1 = dotWorldPos(t, fieldId, side);
    const p2 = screenToWorld(ev.clientX, ev.clientY);
    tempPath.setAttribute('d', pathD(p1,p2,'straight'));

    const hovered = document.elementFromPoint(ev.clientX, ev.clientY);
    const dot = hovered && hovered.classList.contains('dot') ? hovered : null;
    if(dot !== lastDot){
      clearDropHighlights();
      if(dot){
        const sameField = dot.dataset.table===tableId && dot.dataset.field===fieldId;
        dot.classList.add(sameField ? 'drop-reject' : 'drop-target');
      }
      lastDot = dot;
    }
  }
  function cleanup(){
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    wrapper.classList.remove('connecting');
    tempPath.remove();
    clearDropHighlights();
    hideCanvasHint();
    pendingConnect = null;
    activeConnectCancel = null;
    if(!connectMode) document.querySelectorAll('.tbl-resize').forEach(r=>r.classList.remove('resize-disabled'));
  }
  function onUp(ev){
    const target = document.elementFromPoint(ev.clientX, ev.clientY);
    cleanup();
    if(target && target.classList.contains('dot')){
      const toTable = target.dataset.table, toField = target.dataset.field;
      if(!(toTable===tableId && toField===fieldId)){
        const rel = {
          id:uid('r'), fromTable:tableId, fromField:fieldId, toTable, toField,
          cardFrom:'one', cardTo:'many', label:''
        };
        state.relationships.push(rel);
        fullRender(); persist();
        selectItem('rel', rel.id);
        toast('Relationship created');
      }
    }
  }
  activeConnectCancel = cleanup;
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
function cancelActiveConnect(){
  if(activeConnectCancel) activeConnectCancel();
}

/* ---------- Relationship rendering ---------- */
function pathD(p1, p2, style){
  if(style==='straight') return `M${p1.x},${p1.y} L${p2.x},${p2.y}`;
  if(style==='ortho'){
    const midX = (p1.x+p2.x)/2;
    return `M${p1.x},${p1.y} L${midX},${p1.y} L${midX},${p2.y} L${p2.x},${p2.y}`;
  }
  const dx = Math.max(Math.abs(p2.x-p1.x)*0.5, 40);
  return `M${p1.x},${p1.y} C${p1.x+dx*Math.sign(p2.x-p1.x||1)},${p1.y} ${p2.x-dx*Math.sign(p2.x-p1.x||1)},${p2.y} ${p2.x},${p2.y}`;
}

const CROWFOOT = (color)=>`<line x1="0" y1="-7" x2="-16" y2="0" stroke="${color}" stroke-width="2"/>
                <line x1="0" y1="0" x2="-16" y2="0" stroke="${color}" stroke-width="2"/>
                <line x1="0" y1="7" x2="-16" y2="0" stroke="${color}" stroke-width="2"/>`;
const TICK = (x,color)=>`<line x1="${x}" y1="-7" x2="${x}" y2="7" stroke="${color}" stroke-width="2"/>`;
const CIRCLE = (cx,color)=>`<circle cx="${cx}" cy="0" r="6" fill="none" stroke="${color}" stroke-width="2"/>`;

function glyphSvg(px, py, angleDeg, type, color){
  let inner = '';
  switch(type){
    case 'one':
      // One: a single tick across the line
      inner = TICK(-13,color);
      break;
    case 'many':
      // Many: crow's foot only
      inner = CROWFOOT(color);
      break;
    case 'one-only':
      // One and only one: double tick
      inner = TICK(-16,color) + TICK(-10,color);
      break;
    case 'zero-one':
      // Zero or one: circle + single tick
      inner = CIRCLE(-24,color) + TICK(-12,color);
      break;
    case 'one-many':
      // One or many: crow's foot + single tick further out
      inner = CROWFOOT(color) + TICK(-22,color);
      break;
    case 'zero-many':
      // Zero or many: circle + crow's foot
      inner = CIRCLE(-26,color) + CROWFOOT(color);
      break;
  }
  return `<g transform="translate(${px},${py}) rotate(${angleDeg})">${inner}</g>`;
}

function renderRelationships(){
  // preserve defs-less simple render; rebuild svg content each call
  let html = '';
  const lineColorVar = getComputedStyle(document.documentElement).getPropertyValue('--ink-soft').trim() || '#5B6472';
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3B6EF0';

  state.relationships.forEach(r=>{
    const ft = getTable(r.fromTable), tt = getTable(r.toTable);
    if(!ft || !tt) return;
    const geo = computeRelGeometry(r, ft, tt, state.settings.lineStyle);
    const isSel = state.selection && state.selection.type==='rel' && state.selection.id===r.id;
    const color = isSel ? accent : lineColorVar;
    const d = pathD(geo.p1, geo.p2, state.settings.lineStyle);
    html += `<path class="hit rel-path" data-rel-id="${r.id}" d="${d}" stroke="transparent" stroke-width="14" fill="none"></path>`;
    html += `<path data-rel-id="${r.id}" d="${d}" stroke="${color}" stroke-width="${isSel?2.5:1.75}" fill="none"></path>`;
    html += glyphSvg(geo.p1.x, geo.p1.y, geo.angle1, r.cardFrom, color);
    html += glyphSvg(geo.p2.x, geo.p2.y, geo.angle2, r.cardTo, color);
    if(r.label){
      const mx = (geo.p1.x+geo.p2.x)/2, my = (geo.p1.y+geo.p2.y)/2;
      html += `<rect class="rel-label-bg" x="${mx-((r.label.length*3.6)+8)/2}" y="${my-9}" width="${(r.label.length*3.6)+8}" height="16" rx="4" fill="var(--panel)" opacity="0.9"></rect>`;
      html += `<text x="${mx}" y="${my+3}" text-anchor="middle" font-size="10.5" font-family="${'var(--font-ui)'}" fill="${color}">${escapeXml(r.label)}</text>`;
    }
  });
  svg.innerHTML = html;
  svg.querySelectorAll('.hit').forEach(p=>{
    p.addEventListener('mousedown', e=>{ e.stopPropagation(); selectItem('rel', p.dataset.relId); });
  });
}
function escapeXml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function computeRelGeometry(r, ft, tt, style){
  const fCenterX = ft.x + ft.width/2, tCenterX = tt.x + tt.width/2;
  const sideFrom = fCenterX <= tCenterX ? 'right' : 'left';
  const sideTo = fCenterX <= tCenterX ? 'left' : 'right';
  const p1 = dotWorldPos(ft, r.fromField, sideFrom);
  const p2 = dotWorldPos(tt, r.toField, sideTo);
  let outward1, outward2;
  if(style === 'straight'){
    // Direct line: the outward direction really does follow its slope.
    outward1 = Math.atan2(p2.y-p1.y, p2.x-p1.x) * 180/Math.PI;
    outward2 = Math.atan2(p1.y-p2.y, p1.x-p2.x) * 180/Math.PI;
  } else {
    // Curved and orthogonal paths always leave/arrive at a dot horizontally
    // (see pathD), so the outward direction is horizontal too, regardless of
    // how steep the overall connection is.
    outward1 = sideFrom === 'right' ? 0 : 180;
    outward2 = sideTo === 'right' ? 0 : 180;
  }
  // glyphSvg draws each mark along local -x from the dot, which points back
  // the way it came; add a half turn so marks sit out in the open canvas
  // along the connector instead of hidden behind the table they attach to.
  const angle1 = outward1 + 180;
  const angle2 = outward2 + 180;
  return {p1,p2,angle1,angle2};
}

function updateAllPaths(){ renderRelationships(); }

/* ============ Selection & Inspector ============ */
function selectItem(type, id){
  state.selection = {type, id};
  document.querySelectorAll('.tbl').forEach(d=>d.classList.toggle('selected', type==='table' && d.dataset.tableId===id));
  renderRelationships();
  renderInspector();
}
function clearSelection(){
  state.selection = null;
  document.querySelectorAll('.tbl.selected').forEach(d=>d.classList.remove('selected'));
  renderRelationships();
  renderInspector();
}

function renderInspector(){
  inspector.innerHTML = '';
  if(!state.selection){
    inspector.innerHTML = `<h3>Nothing selected</h3><div class="empty-hint">
      Click a table header or a connection line to edit it here.<br><br>
      • Drag a field's dot to another field's dot to create a relationship.<br>
      • Scroll to pan, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+scroll or pinch to zoom.<br>
      • Hold <kbd>Space</kbd> or middle-click to drag-pan anywhere.<br>
      • Press <kbd>Delete</kbd> to remove the selected item, <kbd>Esc</kbd> to cancel a connection.<br>
      • Click the <b>?</b> button for the full shortcut list.
      </div>`;
    return;
  }
  if(state.selection.type==='table'){
    const t = getTable(state.selection.id);
    if(!t){ clearSelection(); return; }
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <h3>Table</h3>
      <div class="field-group">
        <label>Name</label>
        <input type="text" id="insTableName" value="${escapeAttr(t.name)}">
      </div>
      <div class="field-group">
        <label>Header color</label>
        <div class="swatches" id="insSwatches"></div>
      </div>
      <hr class="sep">
      <button class="btn danger" id="insDeleteTable" style="align-self:flex-start;">Delete table</button>
    `;
    inspector.appendChild(wrap);
    const nameInp = wrap.querySelector('#insTableName');
    nameInp.addEventListener('input', ()=>{ t.name = nameInp.value; renderTables(); persist(); selectItem('table', t.id); });
    const sw = wrap.querySelector('#insSwatches');
    PALETTE.forEach(c=>{
      const s = document.createElement('div');
      s.className = 'swatch' + (t.color.toLowerCase()===c.toLowerCase() ? ' active':'');
      s.style.background = c;
      s.addEventListener('click', ()=>{ t.color=c; fullRender(); selectItem('table', t.id); persist(); });
      sw.appendChild(s);
    });
    const customColor = document.createElement('input');
    customColor.type = 'color'; customColor.value = t.color;
    customColor.style.cssText = 'width:28px;height:28px;border:none;background:none;cursor:pointer;padding:0;';
    customColor.addEventListener('input', ()=>{ t.color=customColor.value; fullRender(); selectItem('table', t.id); persist(); });
    sw.appendChild(customColor);
    wrap.querySelector('#insDeleteTable').addEventListener('click', ()=>{
      state.tables = state.tables.filter(x=>x.id!==t.id);
      state.relationships = state.relationships.filter(r=>r.fromTable!==t.id && r.toTable!==t.id);
      clearSelection(); fullRender(); persist();
    });
  } else {
    const r = state.relationships.find(x=>x.id===state.selection.id);
    if(!r){ clearSelection(); return; }
    const ft = getTable(r.fromTable), tt = getTable(r.toTable);
    const ffield = ft ? getField(ft, r.fromField) : null;
    const tfield = tt ? getField(tt, r.toField) : null;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <h3>Relationship</h3>
      <div class="rel-summary">${ft?escapeAttr(ft.name):'?'}.${ffield?escapeAttr(ffield.name):'?'}<br>→ ${tt?escapeAttr(tt.name):'?'}.${tfield?escapeAttr(tfield.name):'?'}</div>
      <div class="two-col">
        <div class="field-group">
          <label>Start (near ${ft?escapeAttr(ft.name):'A'})</label>
          <select id="insCardFrom">${CARD_OPTS.map(o=>`<option value="${o.v}" ${r.cardFrom===o.v?'selected':''}>${o.label}</option>`).join('')}</select>
        </div>
        <div class="field-group">
          <label>End (near ${tt?escapeAttr(tt.name):'B'})</label>
          <select id="insCardTo">${CARD_OPTS.map(o=>`<option value="${o.v}" ${r.cardTo===o.v?'selected':''}>${o.label}</option>`).join('')}</select>
        </div>
      </div>
      <div class="field-group">
        <label>Label (optional)</label>
        <input type="text" id="insRelLabel" value="${escapeAttr(r.label||'')}" placeholder="e.g. places">
      </div>
      <hr class="sep">
      <button class="btn danger" id="insDeleteRel" style="align-self:flex-start;">Delete relationship</button>
    `;
    inspector.appendChild(wrap);
    wrap.querySelector('#insCardFrom').addEventListener('change', e=>{ r.cardFrom=e.target.value; renderRelationships(); persist(); });
    wrap.querySelector('#insCardTo').addEventListener('change', e=>{ r.cardTo=e.target.value; renderRelationships(); persist(); });
    wrap.querySelector('#insRelLabel').addEventListener('input', e=>{ r.label=e.target.value; renderRelationships(); persist(); });
    wrap.querySelector('#insDeleteRel').addEventListener('click', ()=>{
      state.relationships = state.relationships.filter(x=>x.id!==r.id);
      clearSelection(); fullRender(); persist();
    });
  }
}

/* ============ Canvas pan & zoom ============ */
let spaceHeld = false;

function beginPan(e){
  const startX = e.clientX, startY = e.clientY, ox = view.x, oy = view.y;
  wrapper.classList.add('panning');
  function onMove(ev){
    view.x = ox + (ev.clientX-startX);
    view.y = oy + (ev.clientY-startY);
    applyView();
  }
  function onUp(){
    wrapper.classList.remove('panning');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

wrapper.addEventListener('mousedown', e=>{
  // Middle-click or space+drag always pans, regardless of mode or what's under the cursor.
  if(e.button===1 || (spaceHeld && e.button===0)){
    e.preventDefault();
    beginPan(e);
    return;
  }
  if(connectMode) return;
  if(e.target !== wrapper && e.target !== world) return;
  clearSelection();
  beginPan(e);
});
wrapper.addEventListener('auxclick', e=>{ if(e.button===1) e.preventDefault(); });

wrapper.addEventListener('wheel', e=>{
  e.preventDefault();
  // Pinch-to-zoom on trackpads is reported as a wheel event with ctrlKey set;
  // holding Ctrl/Cmd with a regular scroll also zooms. Plain scroll pans instead,
  // which keeps casual scrolling from unexpectedly rescaling the canvas.
  if(e.ctrlKey || e.metaKey){
    const factor = Math.pow(1.0025, -e.deltaY);
    zoomAt(e.clientX, e.clientY, factor);
  } else {
    view.x -= e.shiftKey ? e.deltaY : e.deltaX;
    view.y -= e.shiftKey ? 0 : e.deltaY;
    applyView();
  }
}, {passive:false});

// Touch: one finger pans, two fingers pinch-zoom.
let touchState = null;
function touchDist(t){ return Math.hypot(t[0].clientX-t[1].clientX, t[0].clientY-t[1].clientY); }
function touchMid(t){ return {x:(t[0].clientX+t[1].clientX)/2, y:(t[0].clientY+t[1].clientY)/2}; }
wrapper.addEventListener('touchstart', e=>{
  if(connectMode || pendingConnect) return;
  if(e.touches.length===1){
    touchState = {mode:'pan', x:e.touches[0].clientX, y:e.touches[0].clientY, ox:view.x, oy:view.y};
  } else if(e.touches.length===2){
    touchState = {mode:'zoom', dist:touchDist(e.touches), mid:touchMid(e.touches), scale:view.scale, ox:view.x, oy:view.y};
  }
}, {passive:true});
wrapper.addEventListener('touchmove', e=>{
  if(!touchState) return;
  e.preventDefault();
  if(touchState.mode==='pan' && e.touches.length===1){
    view.x = touchState.ox + (e.touches[0].clientX - touchState.x);
    view.y = touchState.oy + (e.touches[0].clientY - touchState.y);
    applyView();
  } else if(touchState.mode==='zoom' && e.touches.length===2){
    const factor = touchDist(e.touches)/touchState.dist;
    view.scale = touchState.scale;
    view.x = touchState.ox; view.y = touchState.oy;
    zoomAt(touchState.mid.x, touchState.mid.y, factor);
  }
}, {passive:false});
wrapper.addEventListener('touchend', ()=>{ touchState = null; });

document.addEventListener('keydown', e=>{
  if(e.code==='Space' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){
    spaceHeld = true;
    wrapper.style.cursor = 'grab';
  }
});
document.addEventListener('keyup', e=>{
  if(e.code==='Space'){ spaceHeld = false; wrapper.style.cursor = ''; }
});

function zoomAt(cx, cy, factor){
  const r = wrapper.getBoundingClientRect();
  const localX = cx - r.left, localY = cy - r.top;
  const worldX = (localX - view.x)/view.scale, worldY = (localY - view.y)/view.scale;
  view.scale = Math.min(2.5, Math.max(0.25, view.scale*factor));
  view.x = localX - worldX*view.scale;
  view.y = localY - worldY*view.scale;
  applyView();
}

document.getElementById('zoomIn').addEventListener('click', ()=>{
  const r = wrapper.getBoundingClientRect();
  zoomAt(r.left+r.width/2, r.top+r.height/2, 1.2);
});
document.getElementById('zoomOut').addEventListener('click', ()=>{
  const r = wrapper.getBoundingClientRect();
  zoomAt(r.left+r.width/2, r.top+r.height/2, 1/1.2);
});
document.getElementById('zoomFit').addEventListener('click', fitToScreen);

function fitToScreen(){
  if(state.tables.length===0){ view={x:60,y:40,scale:1}; applyView(); return; }
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  state.tables.forEach(t=>{
    minX=Math.min(minX,t.x); minY=Math.min(minY,t.y);
    maxX=Math.max(maxX,t.x+t.width); maxY=Math.max(maxY,t.y+tableHeight(t));
  });
  const pad=60;
  minX-=pad; minY-=pad; maxX+=pad; maxY+=pad;
  const r = wrapper.getBoundingClientRect();
  const scale = Math.min(r.width/(maxX-minX), r.height/(maxY-minY), 1.3);
  view.scale = Math.max(0.25, scale);
  view.x = -minX*view.scale + (r.width - (maxX-minX)*view.scale)/2;
  view.y = -minY*view.scale + (r.height - (maxY-minY)*view.scale)/2;
  applyView();
}

/* ============ Toolbar actions ============ */
document.getElementById('btnAddTable').addEventListener('click', ()=>{
  const center = screenToWorld(wrapper.getBoundingClientRect().left + wrapper.clientWidth/2,
                                wrapper.getBoundingClientRect().top + wrapper.clientHeight/2);
  const t = {
    id: uid('t'), name:'new_table', x: Math.max(0,center.x-110), y: Math.max(0,center.y-60),
    width:210, color: PALETTE[state.tables.length % PALETTE.length],
    fields:[{id:uid('f'), name:'id', type:'INT', pk:true, fk:false, nn:true, uq:false}]
  };
  state.tables.push(t);
  fullRender(); selectItem('table', t.id); persist();
});

document.getElementById('btnConnect').addEventListener('click', function(){
  connectMode = !connectMode;
  this.classList.toggle('active', connectMode);
  wrapper.classList.toggle('connecting', connectMode);
  setDotsActive(connectMode);
  document.querySelectorAll('.tbl-resize').forEach(r=>r.classList.toggle('resize-disabled', connectMode));
  if(connectMode) showCanvasHint('Drag from any field dot to another field to connect them');
  else hideCanvasHint();
  toast(connectMode ? 'Connect mode: drag from a field dot to another field' : 'Connect mode off');
});

document.getElementById('zoomLabel').addEventListener('dblclick', ()=>{
  const r = wrapper.getBoundingClientRect();
  zoomAt(r.left+r.width/2, r.top+r.height/2, 1/view.scale);
});

const shortcutsPop = document.getElementById('shortcutsPop');
document.getElementById('btnHelp').addEventListener('click', function(){
  shortcutsPop.classList.toggle('hidden');
  this.classList.toggle('active', !shortcutsPop.classList.contains('hidden'));
});
document.addEventListener('mousedown', e=>{
  if(!shortcutsPop.classList.contains('hidden') && !shortcutsPop.contains(e.target) && e.target.id!=='btnHelp'){
    shortcutsPop.classList.add('hidden');
    document.getElementById('btnHelp').classList.remove('active');
  }
});

document.getElementById('selLineStyle').addEventListener('change', e=>{
  state.settings.lineStyle = e.target.value; renderRelationships(); persist();
});
document.getElementById('selGrid').addEventListener('change', e=>{
  state.settings.grid = e.target.value; applyGridStyle(); persist();
});
document.getElementById('btnTheme').addEventListener('click', function(){
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur==='dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  state.settings.theme = next;
  this.textContent = next==='dark' ? '☀' : '☾';
  renderRelationships();
  persist();
});
document.getElementById('btnClear').addEventListener('click', ()=>{
  if(!confirm('Start a new diagram? Unsaved export will be lost (auto-save data will be cleared).')) return;
  state = freshState();
  diagramTitle.value = 'Untitled ERD';
  clearSelection(); fullRender(); fitToScreen(); persist();
});
diagramTitle.addEventListener('blur', persist);
diagramTitle.addEventListener('keydown', e=>{ if(e.key==='Enter') diagramTitle.blur(); });

document.addEventListener('keydown', e=>{
  if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) return;
  if((e.key==='Delete' || e.key==='Backspace') && state.selection){
    if(state.selection.type==='table'){
      state.tables = state.tables.filter(t=>t.id!==state.selection.id);
      state.relationships = state.relationships.filter(r=>r.fromTable!==state.selection.id && r.toTable!==state.selection.id);
    } else {
      state.relationships = state.relationships.filter(r=>r.id!==state.selection.id);
    }
    clearSelection(); fullRender(); persist();
  }
  if(e.key==='Escape'){
    if(pendingConnect && typeof cancelActiveConnect==='function') cancelActiveConnect();
    if(connectMode){
      connectMode=false; document.getElementById('btnConnect').classList.remove('active'); wrapper.classList.remove('connecting');
      setDotsActive(false);
    }
  }
  if(e.key==='+' || e.key==='='){
    e.preventDefault();
    const r = wrapper.getBoundingClientRect();
    zoomAt(r.left+r.width/2, r.top+r.height/2, 1.2);
  }
  if(e.key==='-' || e.key==='_'){
    e.preventDefault();
    const r = wrapper.getBoundingClientRect();
    zoomAt(r.left+r.width/2, r.top+r.height/2, 1/1.2);
  }
  if(e.key==='0'){
    e.preventDefault();
    const r = wrapper.getBoundingClientRect();
    zoomAt(r.left+r.width/2, r.top+r.height/2, 1/view.scale);
  }
  if((e.key==='F' || e.key==='f') && e.shiftKey){
    e.preventDefault();
    fitToScreen();
  }
});

/* ============ Export / Import ============ */
function download(filename, content, type){
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}
function safeName(){ return (diagramTitle.value||'diagram').trim().replace(/[^a-z0-9-_]+/gi,'_').toLowerCase() || 'diagram'; }

document.getElementById('btnExportJson').addEventListener('click', ()=>{
  const payload = { title: diagramTitle.value, ...state, selection:null };
  download(safeName()+'.json', JSON.stringify(payload, null, 2), 'application/json');
  toast('Exported JSON');
});

document.getElementById('btnImport').addEventListener('click', ()=>document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', e=>{
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      if(!data.tables) throw new Error('bad format');
      state = { settings: data.settings || freshState().settings, tables: data.tables, relationships: data.relationships||[], selection:null };
      diagramTitle.value = data.title || 'Imported ERD';
      document.documentElement.setAttribute('data-theme', state.settings.theme || 'light');
      document.getElementById('btnTheme').textContent = (state.settings.theme==='dark') ? '☀' : '☾';
      document.getElementById('selLineStyle').value = state.settings.lineStyle||'curved';
      document.getElementById('selGrid').value = state.settings.grid||'grid';
      fullRender(); fitToScreen(); persist();
      toast('Imported diagram');
    }catch(err){
      alert('Could not read that file as an ERD Studio diagram.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

function boundingBoxOfDiagram(){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  state.tables.forEach(t=>{
    minX=Math.min(minX,t.x); minY=Math.min(minY,t.y);
    maxX=Math.max(maxX,t.x+t.width); maxY=Math.max(maxY,t.y+tableHeight(t));
  });
  if(!isFinite(minX)){ minX=0; minY=0; maxX=400; maxY=300; }
  const pad=40;
  return {minX:minX-pad, minY:minY-pad, w:(maxX-minX)+pad*2, h:(maxY-minY)+pad*2};
}

const EXPORT_TABLE_CSS = `
  .etbl{font-family:${JSON.stringify('sans-serif')};border-radius:10px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.18);}
  .ehead{padding:9px 10px;font-weight:700;font-size:13px;color:#fff;font-family:sans-serif;}
  .erow{display:flex;align-items:center;gap:6px;padding:4px 10px;font-size:11.5px;border-top:1px solid #D8DCE3;background:#fff;color:#1F2A44;font-family:monospace;}
  .eflag{font-size:8px;font-weight:700;border:1px solid #D8DCE3;border-radius:4px;padding:0 3px;margin-right:1px;color:#5B6472;}
  .eflag.on{background:#B8791C;color:#fff;border-color:#B8791C;}
  .eflag.fk.on{background:#6C63B5;border-color:#6C63B5;}
  .ename{flex:1;} .etype{color:#5B6472;font-size:10.5px;}
`;

function tableToStaticHtml(t){
  const rows = t.fields.map(f=>`
    <div class="erow">
      <span class="eflag ${f.pk?'on':''}">PK</span><span class="eflag fk ${f.fk?'on':''}">FK</span>
      <span class="eflag ${f.nn?'on':''}">NN</span><span class="eflag ${f.uq?'on':''}">UQ</span>
      <span class="ename">${escapeXml(f.name)}</span><span class="etype">${escapeXml(f.type)}</span>
    </div>`).join('');
  return `<div class="etbl" xmlns="http://www.w3.org/1999/xhtml">
    <div class="ehead" style="background:${t.color}">${escapeXml(t.name)}</div>
    ${rows}
  </div>`;
}

// Builds just the background + connector lines/glyphs/labels as an SVG string,
// with NO <foreignObject> — safe to rasterize onto a <canvas> without tainting it.
function buildLinesSvgBody(bb){
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim();
  const lineColor = getComputedStyle(document.documentElement).getPropertyValue('--ink-soft').trim();
  let body = `<rect x="0" y="0" width="${bb.w}" height="${bb.h}" fill="${bg}"/>`;
  state.relationships.forEach(r=>{
    const ft = getTable(r.fromTable), tt = getTable(r.toTable);
    if(!ft||!tt) return;
    const geo = computeRelGeometry(r, ft, tt, state.settings.lineStyle);
    const p1 = {x:geo.p1.x-bb.minX, y:geo.p1.y-bb.minY};
    const p2 = {x:geo.p2.x-bb.minX, y:geo.p2.y-bb.minY};
    const d = pathD(p1,p2,state.settings.lineStyle);
    body += `<path d="${d}" stroke="${lineColor}" stroke-width="1.75" fill="none"/>`;
    body += glyphSvg(p1.x,p1.y,geo.angle1,r.cardFrom,lineColor);
    body += glyphSvg(p2.x,p2.y,geo.angle2,r.cardTo,lineColor);
    if(r.label){
      const mx=(p1.x+p2.x)/2, my=(p1.y+p2.y)/2;
      body += `<rect x="${mx-((r.label.length*3.6)+8)/2}" y="${my-9}" width="${(r.label.length*3.6)+8}" height="16" rx="4" fill="#fff" opacity="0.9"/>`;
      body += `<text x="${mx}" y="${my+3}" text-anchor="middle" font-size="10.5" font-family="sans-serif" fill="${lineColor}">${escapeXml(r.label)}</text>`;
    }
  });
  return {body, lineColor};
}

function buildExportSvgString(){
  const bb = boundingBoxOfDiagram();
  const {body: linesBody} = buildLinesSvgBody(bb);
  let body = linesBody;
  state.tables.forEach(t=>{
    const h = tableHeight(t)-30;
    body += `<foreignObject x="${t.x-bb.minX}" y="${t.y-bb.minY}" width="${t.width}" height="${h}">${tableToStaticHtml(t)}</foreignObject>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${bb.w}" height="${bb.h}" viewBox="0 0 ${bb.w} ${bb.h}">
<style>${EXPORT_TABLE_CSS}</style>
${body}
</svg>`;
}

// ---- Canvas-native table drawing (used only for PNG export) ----
// foreignObject-based SVGs taint a <canvas> when drawn via drawImage, so PNG
// export draws tables with plain canvas primitives instead of HTML markup.
function roundRectPath(ctx, x, y, w, h, r){
  const {tl,tr,br,bl} = r;
  ctx.beginPath();
  ctx.moveTo(x+tl, y);
  ctx.lineTo(x+w-tr, y);
  ctx.arcTo(x+w, y, x+w, y+tr, tr);
  ctx.lineTo(x+w, y+h-br);
  ctx.arcTo(x+w, y+h, x+w-br, y+h, br);
  ctx.lineTo(x+bl, y+h);
  ctx.arcTo(x, y+h, x, y+h-bl, bl);
  ctx.lineTo(x, y+tl);
  ctx.arcTo(x, y, x+tl, y, tl);
  ctx.closePath();
}
function drawFlagBadge(ctx, x, y, label, on, colorOn){
  const w = label.length>2 ? 20 : 16, h = 12;
  ctx.lineWidth = 1;
  roundRectPath(ctx, x, y, w, h, {tl:3,tr:3,br:3,bl:3});
  ctx.fillStyle = on ? colorOn : '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = on ? colorOn : '#D8DCE3';
  ctx.stroke();
  ctx.fillStyle = on ? '#FFFFFF' : '#5B6472';
  ctx.font = '700 8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x+w/2, y+h/2+0.5);
  return w;
}
function drawTablesOnCanvas(ctx, bb){
  state.tables.forEach(t=>{
    const x = t.x-bb.minX, y = t.y-bb.minY, w = t.width, h = tableHeight(t)-30;
    // body background
    roundRectPath(ctx, x, y, w, h, {tl:10,tr:10,br:10,bl:10});
    ctx.fillStyle = '#FFFFFF';
    ctx.save(); ctx.shadowColor='rgba(0,0,0,.18)'; ctx.shadowBlur=6; ctx.shadowOffsetY=2; ctx.fill(); ctx.restore();
    // header
    roundRectPath(ctx, x, y, w, HEAD_H, {tl:10,tr:10,br:0,bl:0});
    ctx.fillStyle = t.color;
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.name, x+10, y+HEAD_H/2+1, w-20);
    // rows
    t.fields.forEach((f,i)=>{
      const ry = y + HEAD_H + i*ROW_H;
      if(i>0){
        ctx.strokeStyle = '#D8DCE3'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x+w, ry); ctx.stroke();
      }
      let fx = x + 10;
      fx += drawFlagBadge(ctx, fx, ry+(ROW_H-12)/2, 'PK', f.pk, '#B8791C') + 2;
      fx += drawFlagBadge(ctx, fx, ry+(ROW_H-12)/2, 'FK', f.fk, '#6C63B5') + 2;
      fx += drawFlagBadge(ctx, fx, ry+(ROW_H-12)/2, 'NN', f.nn, '#3B6EF0') + 2;
      fx += drawFlagBadge(ctx, fx, ry+(ROW_H-12)/2, 'UQ', f.uq, '#3B6EF0') + 6;
      ctx.fillStyle = '#1F2A44';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const typeW = ctx.measureText(f.type).width;
      const nameMaxW = Math.max(20, (x+w-10-typeW-8) - fx);
      ctx.fillText(f.name, fx, ry+ROW_H/2+1, nameMaxW);
      ctx.fillStyle = '#5B6472';
      ctx.font = '10.5px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(f.type, x+w-10, ry+ROW_H/2+1);
    });
  });
}

document.getElementById('btnExportSvg').addEventListener('click', ()=>{
  download(safeName()+'.svg', buildExportSvgString(), 'image/svg+xml');
  toast('Exported SVG');
});

document.getElementById('btnExportPng').addEventListener('click', ()=>{
  const bb = boundingBoxOfDiagram();
  const {body: linesBody} = buildLinesSvgBody(bb);
  const linesSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${bb.w}" height="${bb.h}" viewBox="0 0 ${bb.w} ${bb.h}">${linesBody}</svg>`;
  const scaleFactor = 2;
  const img = new Image();
  const blob = new Blob([linesSvg], {type:'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  img.onload = () => {
    try{
      const canvas = document.createElement('canvas');
      canvas.width = bb.w*scaleFactor; canvas.height = bb.h*scaleFactor;
      const ctx = canvas.getContext('2d');
      ctx.scale(scaleFactor, scaleFactor);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      drawTablesOnCanvas(ctx, bb); // tables drawn natively — keeps canvas untainted
      canvas.toBlob(pngBlob=>{
        if(!pngBlob){ toast('PNG export failed — try Export SVG instead'); return; }
        const a = document.createElement('a');
        const pngUrl = URL.createObjectURL(pngBlob);
        a.href = pngUrl; a.download = safeName()+'.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(pngUrl), 2000);
        toast('Exported PNG');
      }, 'image/png');
    }catch(err){
      toast('PNG export failed — try Export SVG instead');
      URL.revokeObjectURL(url);
    }
  };
  img.onerror = () => { toast('PNG export failed — try Export SVG instead'); URL.revokeObjectURL(url); };
  img.src = url;
});

/* ============ Persistence (per-session storage API) ============ */
let persistTimer = null;
function persist(){
  clearTimeout(persistTimer);
  persistTimer = setTimeout(async ()=>{
    try{
      if(window.storage){
        await window.storage.set('erd-studio:diagram', JSON.stringify({title:diagramTitle.value, ...state, selection:null}), false);
      }
    }catch(err){ /* storage not available - export/import still works */ }
  }, 400);
}
async function tryLoadPersisted(){
  try{
    if(window.storage){
      const res = await window.storage.get('erd-studio:diagram', false);
      if(res && res.value){
        const data = JSON.parse(res.value);
        if(data && data.tables){
          state = { settings:data.settings||freshState().settings, tables:data.tables, relationships:data.relationships||[], selection:null };
          diagramTitle.value = data.title || 'Untitled ERD';
          return true;
        }
      }
    }
  }catch(err){ /* fall through to sample */ }
  return false;
}

/* ============ Init ============ */
(async function init(){
  document.getElementById('typeList').innerHTML = TYPES.map(t=>`<option value="${t}"></option>`).join('');
  const loaded = await tryLoadPersisted();
  state = loaded ? state : sampleState();
  document.documentElement.setAttribute('data-theme', state.settings.theme||'light');
  document.getElementById('btnTheme').textContent = (state.settings.theme==='dark') ? '☀' : '☾';
  document.getElementById('selLineStyle').value = state.settings.lineStyle||'curved';
  document.getElementById('selGrid').value = state.settings.grid||'grid';
  applyView();
  fullRender();
  requestAnimationFrame(fitToScreen);
})();

})();
