// ---------------------------------------------------------------
// STATE
// ---------------------------------------------------------------
const PALETTES = [
  ['#E8833A','#E3B23C','#7C8A3E','#3FB6B0','#D94F7C','#B5651D','#2E7FB8'],
  ['#2E6F6E','#3F9C8E','#8FBF6E','#D9A441','#B4552F','#6C5B7B','#355C7D'],
  ['#264653','#2A9D8F','#E9C46A','#F4A261','#E76F51','#8AB17D','#606C38'],
  ['#5B2A86','#8E44AD','#C0392B','#D35400','#16A085','#2980B9','#7F8C8D'],
  ['#111318','#3A3A3A','#6B6B6B','#9A9A9A','#C4C4C4','#4B4B4B','#1F1F1F'],
];

let state = {
  layout: 'vertical',
  paletteIndex: 0,
  bg: '#ffffff',
  cardRadius: 4,
  fontFamily: "Arial, Helvetica, sans-serif",
  titleSize: 42,
  bodySize: 14,
  itemTitleWeight: 700,
  mainTitle: 'TIMELINE',
  subTitle: 'Iunno something I guess',
  items: []
};

let idCounter = 0;
function newItem(overrides){
  idCounter += 1;
  const palette = PALETTES[state.paletteIndex];
  return Object.assign({
    id: 'it'+idCounter,
    date: '',
    title: '',
    desc: '',
    color: palette[(idCounter-1) % palette.length],
    image: null,
    open: true
  }, overrides || {});
}

// seed with the same joke placeholder content used for new events, so the
// tool is obviously a blank template rather than someone else's example
state.items = [
  newItem({date:'2000 (put the date here, bro)', title:"TITLE (you know, like the book's name or whatever)", desc:'BODY (write what you want in here, like what happened during that time)'}),
  newItem({date:'2010 (put the date here, bro)', title:"TITLE (you know, like the book's name or whatever)", desc:'BODY (write what you want in here, like what happened during that time)'}),
  newItem({date:'2020 (put the date here, bro)', title:"TITLE (you know, like the book's name or whatever)", desc:'BODY (write what you want in here, like what happened during that time)'}),
];

// ---------------------------------------------------------------
// SIDEBAR: palette swatches
// ---------------------------------------------------------------
const paletteSwatchesEl = document.getElementById('paletteSwatches');
function renderPaletteSwatches(){
  paletteSwatchesEl.innerHTML = '';
  PALETTES.forEach((pal, i)=>{
    const sw = document.createElement('div');
    sw.className = 'swatch' + (i===state.paletteIndex ? ' active':'');
    sw.style.background = `linear-gradient(135deg, ${pal[0]}, ${pal[2]}, ${pal[4]})`;
    sw.title = 'Palette ' + (i+1);
    sw.addEventListener('click', ()=>{
      state.paletteIndex = i;
      // reassign colors to items in order, cycling
      state.items.forEach((it, idx)=> it.color = PALETTES[i][idx % PALETTES[i].length]);
      renderPaletteSwatches();
      renderItemsList();
      renderTimeline();
    });
    paletteSwatchesEl.appendChild(sw);
  });
}
renderPaletteSwatches();

// ---------------------------------------------------------------
// SIDEBAR: layout selector
// ---------------------------------------------------------------
document.getElementById('layoutGrid').addEventListener('click', (e)=>{
  const opt = e.target.closest('.style-opt');
  if(!opt) return;
  document.querySelectorAll('#layoutGrid .style-opt').forEach(o=>o.classList.remove('active'));
  opt.classList.add('active');
  state.layout = opt.dataset.layout;
  applyOrientationWidth();
  renderTimeline();
});

// ---------------------------------------------------------------
// ORIENTATION (canvas width preset -> landscape / square / portrait)
// ---------------------------------------------------------------
const ORIENTATION_WIDTHS = { landscape: 1680, square: 1150, portrait: 820 };
state.orientation = 'landscape';
document.getElementById('orientation').addEventListener('change', e=>{
  state.orientation = e.target.value;
  applyOrientationWidth();
});
function applyOrientationWidth(){
  const w = ORIENTATION_WIDTHS[state.orientation];
  tlRoot.style.width = w + 'px';
}

// ---------------------------------------------------------------
// SIDEBAR: header text
// ---------------------------------------------------------------
document.getElementById('mainTitle').addEventListener('input', e=>{
  state.mainTitle = e.target.value;
  document.getElementById('renderTitle').textContent = state.mainTitle;
});
document.getElementById('subTitle').addEventListener('input', e=>{
  state.subTitle = e.target.value;
  document.getElementById('renderSubtitle').textContent = state.subTitle;
});

// ---------------------------------------------------------------
// SIDEBAR: background & card radius
// ---------------------------------------------------------------
const bgColorInput = document.getElementById('bgColor');
const bgPreset = document.getElementById('bgPreset');
bgColorInput.addEventListener('input', e=>{ state.bg = e.target.value; applyGlobalStyles(); });
bgPreset.addEventListener('change', e=>{
  state.bg = e.target.value;
  bgColorInput.value = e.target.value;
  applyGlobalStyles();
});
document.getElementById('cardRadius').addEventListener('change', e=>{
  state.cardRadius = parseInt(e.target.value,10);
  applyGlobalStyles();
});

// ---------------------------------------------------------------
// SIDEBAR: typography
// ---------------------------------------------------------------
document.getElementById('fontFamily').addEventListener('change', e=>{
  state.fontFamily = e.target.value;
  applyGlobalStyles();
});
document.getElementById('titleSize').addEventListener('input', e=>{
  state.titleSize = parseInt(e.target.value,10) || 42;
  applyGlobalStyles();
});
document.getElementById('bodySize').addEventListener('input', e=>{
  state.bodySize = parseInt(e.target.value,10) || 14;
  applyGlobalStyles();
});
document.getElementById('itemTitleWeight').addEventListener('change', e=>{
  state.itemTitleWeight = e.target.value;
  applyGlobalStyles();
});

function applyGlobalStyles(){
  const root = document.getElementById('tlRoot');
  root.style.background = state.bg;
  root.style.fontFamily = state.fontFamily;
  root.style.setProperty('--card-radius', state.cardRadius + 'px');
  // dark bg -> flip base text color
  const isDark = isColorDark(state.bg);
  root.style.color = isDark ? '#F2F0EA' : '#1c1e24';

  document.getElementById('renderTitle').style.fontSize = state.titleSize + 'px';
  document.getElementById('renderTitle').style.fontFamily = state.fontFamily;
  document.getElementById('renderSubtitle').style.fontSize = (state.bodySize + 3) + 'px';
  document.querySelectorAll('.tl-item-desc, .tl-item-title, .tl-date').forEach(()=>{});
  renderTimeline();
}

function isColorDark(hex){
  hex = hex.replace('#','');
  if(hex.length===3) hex = hex.split('').map(c=>c+c).join('');
  const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
  const lum = (0.299*r + 0.587*g + 0.114*b);
  return lum < 140;
}

function readableTextColor(bgHex){
  return isColorDark(bgHex) ? '#ffffff' : '#1c1e24';
}

function tint(hex, amount){
  // amount 0..1 -> lighten
  hex = hex.replace('#','');
  if(hex.length===3) hex = hex.split('').map(c=>c+c).join('');
  const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
  const nr = Math.round(r + (255-r)*amount);
  const ng = Math.round(g + (255-g)*amount);
  const nb = Math.round(b + (255-b)*amount);
  return `rgb(${nr},${ng},${nb})`;
}

// ---------------------------------------------------------------
// ITEMS: sidebar list rendering
// ---------------------------------------------------------------
const itemsListEl = document.getElementById('itemsList');

function renderItemsList(){
  itemsListEl.innerHTML = '';
  state.items.forEach((it, idx)=>{
    const card = document.createElement('div');
    card.className = 'item-card';

    const head = document.createElement('div');
    head.className = 'item-card-head';
    head.innerHTML = `
      <div class="item-card-title">
        <span class="item-dot" style="background:${it.color}"></span>
        <span>${escapeHtml(it.date || 'Date')} · ${escapeHtml(it.title || 'Untitled event')}</span>
      </div>
    `;
    const btnWrap = document.createElement('div');
    const upBtn = document.createElement('button');
    upBtn.className = 'icon-btn'; upBtn.title='Move up'; upBtn.innerHTML='&#8593;';
    upBtn.addEventListener('click', (e)=>{e.stopPropagation(); moveItem(idx,-1);});
    const downBtn = document.createElement('button');
    downBtn.className = 'icon-btn'; downBtn.title='Move down'; downBtn.innerHTML='&#8595;';
    downBtn.addEventListener('click', (e)=>{e.stopPropagation(); moveItem(idx,1);});
    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn'; delBtn.title='Delete'; delBtn.innerHTML='&#10005;';
    delBtn.addEventListener('click', (e)=>{e.stopPropagation(); state.items.splice(idx,1); renderItemsList(); renderTimeline();});
    btnWrap.appendChild(upBtn); btnWrap.appendChild(downBtn); btnWrap.appendChild(delBtn);
    head.appendChild(btnWrap);
    head.addEventListener('click', ()=>{ it.open = !it.open; renderItemsList(); });

    const body = document.createElement('div');
    body.className = 'item-body' + (it.open ? ' open':'');

    body.innerHTML = `
      <label>Date / label</label>
      <input type="text" class="f-date" value="${escapeAttr(it.date)}" placeholder="2000 (put the date here, bro)">
      <label>Event title</label>
      <input type="text" class="f-title" value="${escapeAttr(it.title)}" placeholder="TITLE (you know, like the book's name or whatever)">
      <label>Description</label>
      <textarea class="f-desc" placeholder="BODY (write what you want in here, like what happened during that time)">${escapeHtml(it.desc)}</textarea>
      <label>Accent color</label>
      <input type="color" class="f-color" value="${it.color}">
      <label>Image (optional)</label>
      <div class="img-row">
        ${it.image ? `<img class="img-thumb" src="${it.image}">` : `<div class="img-thumb" style="display:flex;align-items:center;justify-content:center;font-size:9px;color:#8b93b8;">none</div>`}
        <button class="file-btn f-imgbtn">${it.image ? 'Replace' : 'Upload'}</button>
        ${it.image ? '<button class="remove-img f-imgremove">Remove</button>' : ''}
        <input type="file" accept="image/*" class="f-imgfile" style="display:none;">
      </div>
    `;

    body.querySelector('.f-date').addEventListener('input', e=>{ it.date = e.target.value; head.querySelector('span:last-child').textContent = `${it.date||'Date'} · ${it.title||'Untitled event'}`; renderTimeline(); });
    body.querySelector('.f-title').addEventListener('input', e=>{ it.title = e.target.value; head.querySelector('span:last-child').textContent = `${it.date||'Date'} · ${it.title||'Untitled event'}`; renderTimeline(); });
    body.querySelector('.f-desc').addEventListener('input', e=>{ it.desc = e.target.value; renderTimeline(); });
    body.querySelector('.f-color').addEventListener('input', e=>{ it.color = e.target.value; head.querySelector('.item-dot').style.background = it.color; renderTimeline(); });

    const fileInput = body.querySelector('.f-imgfile');
    body.querySelector('.f-imgbtn').addEventListener('click', ()=> fileInput.click());
    fileInput.addEventListener('change', (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (ev)=>{
        it.image = ev.target.result;
        renderItemsList();
        renderTimeline();
      };
      reader.readAsDataURL(file);
    });
    const removeBtn = body.querySelector('.f-imgremove');
    if(removeBtn){
      removeBtn.addEventListener('click', ()=>{ it.image = null; renderItemsList(); renderTimeline(); });
    }

    card.appendChild(head);
    card.appendChild(body);
    itemsListEl.appendChild(card);
  });
}

function moveItem(idx, dir){
  const newIdx = idx + dir;
  if(newIdx < 0 || newIdx >= state.items.length) return;
  const tmp = state.items[idx];
  state.items[idx] = state.items[newIdx];
  state.items[newIdx] = tmp;
  renderItemsList();
  renderTimeline();
}

document.getElementById('addItemBtn').addEventListener('click', ()=>{
  const it = newItem({
    date:'2000 (put the date here, bro)',
    title:"TITLE (you know, like the book's name or whatever)",
    desc:'BODY (write what you want in here, like what happened during that time)'
  });
  it.open = true;
  state.items.push(it);
  renderItemsList();
  renderTimeline();
});

function escapeHtml(str){
  return String(str||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function escapeAttr(str){ return escapeHtml(str); }

// ---------------------------------------------------------------
// TIMELINE RENDERING (the exportable canvas)
// ---------------------------------------------------------------
const tlRoot = document.getElementById('tlRoot');
const tlTrack = document.getElementById('tlTrack');

function renderTimeline(){
  tlRoot.className = 'layout-' + state.layout;
  tlTrack.innerHTML = '';
  tlTrack.style.gridTemplateColumns = '';

  const bodyPx = state.bodySize + 'px';
  const titleFontWeight = state.itemTitleWeight;

  if(state.layout === 'vertical'){
    const spine = document.createElement('div');
    spine.className = 'tl-spine';
    spine.style.background = '#DDD8C8';
    tlTrack.appendChild(spine);

    state.items.forEach((it, idx)=>{
      const isLeft = idx % 2 === 0;
      const row = document.createElement('div');
      row.className = 'tl-row ' + (isLeft ? 'left':'right');

      const sideFilled = document.createElement('div');
      sideFilled.className = 'tl-side filled';
      sideFilled.innerHTML = buildCardHTML(it, bodyPx, titleFontWeight);

      const sideEmpty = document.createElement('div');
      sideEmpty.className = 'tl-side empty';

      const node = document.createElement('div');
      node.className = 'tl-node';
      node.style.color = it.color;
      node.style.background = it.color;

      if(isLeft){
        row.appendChild(sideFilled);
        row.appendChild(node);
        row.appendChild(sideEmpty);
      } else {
        row.appendChild(sideEmpty);
        row.appendChild(node);
        row.appendChild(sideFilled);
      }
      tlTrack.appendChild(row);
    });
  }

  else if(state.layout === 'list'){
    const spine = document.createElement('div');
    spine.className = 'tl-spine';
    spine.style.background = '#DDD8C8';
    tlTrack.appendChild(spine);

    state.items.forEach(it=>{
      const row = document.createElement('div');
      row.className = 'tl-row';
      const node = document.createElement('div');
      node.className = 'tl-node';
      node.style.color = it.color;
      node.style.background = it.color;
      const content = document.createElement('div');
      content.innerHTML = buildCardHTML(it, bodyPx, titleFontWeight);
      row.appendChild(node);
      row.appendChild(content.firstElementChild);
      tlTrack.appendChild(row);
    });
  }

  else if(state.layout === 'horizontal'){
    state.items.forEach((it, idx)=>{
      const col = document.createElement('div');
      col.className = 'tl-col' + (idx % 2 === 1 ? ' up' : '');

      const iconRow = document.createElement('div');
      iconRow.className = 'tl-icon-row';
      iconRow.textContent = '●';
      iconRow.style.color = it.color;

      const dateBlock = document.createElement('div');
      dateBlock.className = 'tl-date-block';
      dateBlock.textContent = it.date || '—';
      dateBlock.style.background = it.color;
      dateBlock.style.color = readableTextColor(it.color);
      dateBlock.style.fontSize = (state.bodySize + 8) + 'px';

      const spineH = document.createElement('div');
      spineH.className = 'tl-spine-h';
      spineH.style.background = it.color;

      const contentWrap = document.createElement('div');
      contentWrap.className = idx % 2 === 1 ? 'tl-above' : 'tl-below';
      contentWrap.style.background = tint(it.color, 0.85);
      contentWrap.innerHTML = `
        ${it.image ? `<img class="tl-img" src="${it.image}">` : ''}
        <h3 class="tl-item-title" style="font-weight:${titleFontWeight}; font-size:${state.bodySize+3}px; color:${it.color};">${escapeHtml(it.title)}</h3>
        <p class="tl-item-desc" style="font-size:${bodyPx};">${escapeHtml(it.desc)}</p>
      `;

      col.appendChild(iconRow);
      col.appendChild(dateBlock);
      col.appendChild(spineH);
      col.appendChild(contentWrap);
      tlTrack.appendChild(col);
    });
  }

  else if(state.layout === 'grid'){
    state.items.forEach(it=>{
      const col = document.createElement('div');
      col.className = 'tl-col';
      col.style.background = tint(it.color, 0.88);
      col.style.borderTop = `5px solid ${it.color}`;
      col.innerHTML = `
        ${it.image ? `<img class="tl-img" src="${it.image}">` : ''}
        <div class="tl-date" style="background:${it.color}; color:${readableTextColor(it.color)}; font-size:${state.bodySize-1}px;">${escapeHtml(it.date)}</div>
        <h3 class="tl-item-title" style="font-weight:${titleFontWeight}; font-size:${state.bodySize+4}px; color:${it.color};">${escapeHtml(it.title)}</h3>
        <p class="tl-item-desc" style="font-size:${bodyPx};">${escapeHtml(it.desc)}</p>
      `;
      tlTrack.appendChild(col);
    });
  }

  else if(state.layout === 'chevron'){
    const n = state.items.length;
    const rowAbove = document.createElement('div');
    rowAbove.className = 'tl-rowline tl-row-above';
    const rowChevron = document.createElement('div');
    rowChevron.className = 'tl-rowline tl-row-chevron';
    const rowBelow = document.createElement('div');
    rowBelow.className = 'tl-rowline tl-row-below';

    state.items.forEach((it, idx)=>{
      const textUp = idx % 2 === 0;
      const textHTML = `
        ${it.image ? `<img class="tl-img" style="max-height:90px;" src="${it.image}">` : ''}
        <h3 class="tl-item-title" style="font-weight:${titleFontWeight}; font-size:${state.bodySize+4}px; color:${it.color};">${escapeHtml(it.title)}</h3>
        <p class="tl-item-desc" style="font-size:${bodyPx};">${escapeHtml(it.desc)}</p>
      `;

      const aboveCell = document.createElement('div');
      aboveCell.className = 'tl-cell';
      aboveCell.style.color = it.color;
      if(textUp){
        aboveCell.innerHTML = `<div class="tl-txt">${textHTML}</div><div class="tl-connector"></div><div class="tl-dot"></div>`;
      }
      rowAbove.appendChild(aboveCell);

      const chevronCell = document.createElement('div');
      chevronCell.className = 'tl-chevron-cell';
      chevronCell.style.background = it.color;
      chevronCell.style.zIndex = n - idx;
      chevronCell.style.fontSize = (state.bodySize + 4) + 'px';
      chevronCell.style.fontWeight = titleFontWeight;
      const label = document.createElement('span');
      label.style.position = 'relative';
      label.style.zIndex = '4';
      label.textContent = it.date;
      chevronCell.appendChild(label);
      if(idx < n - 1){
        const triRight = document.createElement('div');
        triRight.className = 'tl-tri-right';
        triRight.style.borderLeftColor = it.color;
        chevronCell.appendChild(triRight);
      }
      rowChevron.appendChild(chevronCell);

      const belowCell = document.createElement('div');
      belowCell.className = 'tl-cell';
      belowCell.style.color = it.color;
      if(!textUp){
        belowCell.innerHTML = `<div class="tl-dot"></div><div class="tl-connector"></div><div class="tl-txt">${textHTML}</div>`;
      }
      rowBelow.appendChild(belowCell);
    });

    tlTrack.appendChild(rowAbove);
    tlTrack.appendChild(rowChevron);
    tlTrack.appendChild(rowBelow);
  }

  else if(state.layout === 'axis'){
    const rowAbove = document.createElement('div');
    rowAbove.className = 'tl-rowline tl-row-above';
    const rowBar = document.createElement('div');
    rowBar.className = 'tl-rowline';
    const rowDates = document.createElement('div');
    rowDates.className = 'tl-rowline';
    const rowBelow = document.createElement('div');
    rowBelow.className = 'tl-rowline tl-row-below';

    state.items.forEach((it, idx)=>{
      const aboveCell = document.createElement('div');
      aboveCell.className = 'tl-cell';
      aboveCell.style.color = it.color;
      if(idx % 2 === 0){
        aboveCell.innerHTML = `<div class="tl-txt">${it.image ? `<img class="tl-img" style="max-height:90px;" src="${it.image}">` : ''}<h3 class="tl-item-title" style="font-weight:${titleFontWeight}; font-size:${state.bodySize+3}px; color:${it.color};">${escapeHtml(it.title)}</h3><p class="tl-item-desc" style="font-size:${bodyPx};">${escapeHtml(it.desc)}</p></div><div class="tl-arrow">&#8595;</div>`;
      }
      rowAbove.appendChild(aboveCell);

      const barCell = document.createElement('div');
      barCell.className = 'tl-bar-cell';
      barCell.style.background = it.color;
      rowBar.appendChild(barCell);

      const dateCell = document.createElement('div');
      dateCell.className = 'tl-date-cell';
      dateCell.style.color = it.color;
      dateCell.style.fontSize = (state.bodySize + 2) + 'px';
      dateCell.textContent = it.date;
      rowDates.appendChild(dateCell);

      const belowCell = document.createElement('div');
      belowCell.className = 'tl-cell';
      belowCell.style.color = it.color;
      if(idx % 2 === 1){
        belowCell.innerHTML = `<div class="tl-arrow">&#8593;</div><div class="tl-txt">${it.image ? `<img class="tl-img" style="max-height:90px;" src="${it.image}">` : ''}<h3 class="tl-item-title" style="font-weight:${titleFontWeight}; font-size:${state.bodySize+3}px; color:${it.color};">${escapeHtml(it.title)}</h3><p class="tl-item-desc" style="font-size:${bodyPx};">${escapeHtml(it.desc)}</p></div>`;
      }
      rowBelow.appendChild(belowCell);
    });

    tlTrack.appendChild(rowAbove);
    tlTrack.appendChild(rowBar);
    tlTrack.appendChild(rowDates);
    tlTrack.appendChild(rowBelow);
  }
}

function buildCardHTML(it, bodyPx, titleWeight){
  return `
    <div class="tl-content" style="background:${tint(it.color,0.88)};">
      ${it.image ? `<img class="tl-img" src="${it.image}">` : ''}
      <div class="tl-date" style="background:${it.color}; color:${readableTextColor(it.color)}; font-size:${parseInt(bodyPx)-1}px;">${escapeHtml(it.date)}</div>
      <h3 class="tl-item-title" style="font-weight:${titleWeight}; font-size:${parseInt(bodyPx)+4}px; color:${it.color};">${escapeHtml(it.title)}</h3>
      <p class="tl-item-desc" style="font-size:${bodyPx};">${escapeHtml(it.desc)}</p>
    </div>
  `;
}

// ---------------------------------------------------------------
// ZOOM
// ---------------------------------------------------------------
let zoom = 0.8;
const canvasArea = document.getElementById('canvasArea');
function applyZoom(){
  canvasArea.style.transform = `scale(${zoom})`;
  canvasArea.style.transformOrigin = 'top center';
  document.getElementById('zoomLabel').textContent = Math.round(zoom*100) + '%';
}
document.getElementById('zoomIn').addEventListener('click', ()=>{ zoom = Math.min(1.5, zoom+0.1); applyZoom(); });
document.getElementById('zoomOut').addEventListener('click', ()=>{ zoom = Math.max(0.3, zoom-0.1); applyZoom(); });

// ---------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------
const exportStatus = document.getElementById('exportStatus');

async function captureCanvas(scale){
  // temporarily reset zoom transform for accurate capture
  const prevTransform = canvasArea.style.transform;
  canvasArea.style.transform = 'none';
  const canvas = await html2canvas(tlRoot, {
    scale: scale,
    backgroundColor: state.bg,
    useCORS: true,
    logging: false
  });
  canvasArea.style.transform = prevTransform;
  return canvas;
}

document.querySelectorAll('.export-grid .btn').forEach(btn=>{
  btn.addEventListener('click', async ()=>{
    const format = btn.dataset.format;
    const scale = parseInt(document.getElementById('exportScale').value, 10);
    const fileName = (document.getElementById('fileName').value || 'timeline').trim();
    exportStatus.textContent = 'Rendering...';
    btn.disabled = true;
    try{
      const canvas = await captureCanvas(scale);
      if(format === 'pdf'){
        const { jsPDF } = window.jspdf;
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(fileName + '.pdf');
      } else {
        const mime = format === 'jpeg' ? 'image/jpeg' : (format === 'webp' ? 'image/webp' : 'image/png');
        const quality = format === 'png' ? undefined : 0.95;
        canvas.toBlob((blob)=>{
          if(!blob){ exportStatus.textContent = 'Export failed — this browser may not support WEBP encoding.'; return; }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName + '.' + format;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }, mime, quality);
      }
      exportStatus.textContent = 'Done — check your downloads.';
    } catch(err){
      console.error(err);
      exportStatus.textContent = 'Something went wrong during export.';
    } finally {
      btn.disabled = false;
    }
  });
});

// ---------------------------------------------------------------
// INIT
// ---------------------------------------------------------------
renderItemsList();
applyOrientationWidth();
applyGlobalStyles();
applyZoom();
