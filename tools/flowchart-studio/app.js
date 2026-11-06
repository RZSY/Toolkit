(function () {
  "use strict";

  // ---------- tokens ----------
  const ACCENT = "#4FA79B";
  const WARN = "#D18A3D";
  const CANVAS_BG = "#F6F3EC";
  const NODE_COLORS = ["#39456A", "#2E6F6A", "#BE7A1B", "#6B4E71", "#A03E48", "#F3F0E7"];
  const SHAPES = [
    { type: "rect", label: "Process", w: 168, h: 66 },
    { type: "rounded", label: "Subprocess", w: 168, h: 66 },
    { type: "diamond", label: "Decision", w: 156, h: 112 },
    { type: "ellipse", label: "Input / Output", w: 176, h: 82 },
    { type: "stadium", label: "Start / End", w: 160, h: 56 },
  ];
  const VB0 = { x: 0, y: 0, w: 1040, h: 660 };
  const MIN_W = 320, MAX_W = 2800;
  const SVG_NS = "http://www.w3.org/2000/svg";

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const textOn = (fill) => (fill === "#F3F0E7" ? "#22242B" : "#F5F3EE");

  function mk(tag, attrs) {
    const e = document.createElementNS(SVG_NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // boundary point of a shape's outline in direction (dx,dy) from its center
  function boundary(shape, w, h, dx, dy) {
    const hw = w / 2, hh = h / 2;
    if (dx === 0 && dy === 0) return { x: 0, y: 0 };
    if (shape === "diamond") {
      const t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
      return { x: dx * t, y: dy * t };
    }
    if (shape === "ellipse") {
      const t = 1 / Math.sqrt((dx / hw) ** 2 + (dy / hh) ** 2);
      return { x: dx * t, y: dy * t };
    }
    const tX = dx !== 0 ? hw / Math.abs(dx) : Infinity;
    const tY = dy !== 0 ? hh / Math.abs(dy) : Infinity;
    const t = Math.min(tX, tY);
    return { x: dx * t, y: dy * t };
  }

  // ---------- icons ----------
  function iconSvg(paths, opts) {
    opts = opts || {};
    const s = mk("svg", { width: opts.size || 13, height: opts.size || 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" });
    paths.forEach((p) => s.appendChild(mk(p.tag, p.attrs)));
    return s;
  }
  const downloadIcon = () => iconSvg([{ tag: "path", attrs: { d: "M12 3v12" } }, { tag: "path", attrs: { d: "M7 10l5 5 5-5" } }, { tag: "path", attrs: { d: "M5 21h14" } }]);
  const imageIcon = () => iconSvg([{ tag: "rect", attrs: { x: 3, y: 3, width: 18, height: 18, rx: 2 } }, { tag: "circle", attrs: { cx: 8.5, cy: 8.5, r: 1.5 } }, { tag: "path", attrs: { d: "M21 15l-5-5L5 21" } }]);
  const link2Icon = () => iconSvg([{ tag: "path", attrs: { d: "M9 17H7A5 5 0 0 1 7 7h2" } }, { tag: "path", attrs: { d: "M15 7h2a5 5 0 0 1 0 10h-2" } }, { tag: "line", attrs: { x1: 8, y1: 12, x2: 16, y2: 12 } }]);
  const trashIcon = () => iconSvg([{ tag: "path", attrs: { d: "M3 6h18" } }, { tag: "path", attrs: { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" } }, { tag: "path", attrs: { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" } }, { tag: "line", attrs: { x1: 10, y1: 11, x2: 10, y2: 17 } }, { tag: "line", attrs: { x1: 14, y1: 11, x2: 14, y2: 17 } }]);
  const magnifierIcon = (withPlus) => iconSvg([{ tag: "circle", attrs: { cx: 11, cy: 11, r: 7 } }, { tag: "line", attrs: { x1: 21, y1: 21, x2: 16.65, y2: 16.65 } }, { tag: "line", attrs: { x1: 8, y1: 11, x2: 14, y2: 11 } }].concat(withPlus ? [{ tag: "line", attrs: { x1: 11, y1: 8, x2: 11, y2: 14 } }] : []));
  const maximizeIcon = () => iconSvg([{ tag: "path", attrs: { d: "M8 3H5a2 2 0 0 0-2 2v3" } }, { tag: "path", attrs: { d: "M16 3h3a2 2 0 0 1 2 2v3" } }, { tag: "path", attrs: { d: "M8 21H5a2 2 0 0 1-2-2v-3" } }, { tag: "path", attrs: { d: "M16 21h3a2 2 0 0 0 2-2v-3" } }]);

  function shapePreviewSvg(type, size, color) {
    size = size || 24; color = color || ACCENT;
    const w = size, h = size * 0.66, cx = w / 2, cy = h / 2;
    const s = mk("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}` });
    let shape;
    if (type === "rect") shape = mk("rect", { x: 2, y: 2, width: w - 4, height: h - 4, fill: "none", stroke: color, "stroke-width": 2.2 });
    else if (type === "rounded") shape = mk("rect", { x: 2, y: 2, width: w - 4, height: h - 4, rx: 6, fill: "none", stroke: color, "stroke-width": 2.2 });
    else if (type === "stadium") shape = mk("rect", { x: 2, y: 2, width: w - 4, height: h - 4, rx: (h - 4) / 2, fill: "none", stroke: color, "stroke-width": 2.2 });
    else if (type === "ellipse") shape = mk("ellipse", { cx, cy, rx: w / 2 - 2, ry: h / 2 - 2, fill: "none", stroke: color, "stroke-width": 2.2 });
    else shape = mk("polygon", { points: `${cx},2 ${w - 2},${cy} ${cx},${h - 2} 2,${cy}`, fill: "none", stroke: color, "stroke-width": 2.2 });
    s.appendChild(shape);
    return s;
  }

  // ---------- state ----------
  let nodes = [
    { id: 1, x: 60, y: 40, w: 160, h: 56, shape: "stadium", text: "Start", color: "#2E6F6A" },
    { id: 2, x: 40, y: 160, w: 190, h: 70, shape: "rect", text: "Collect user input", color: "#39456A" },
    { id: 3, x: 60, y: 300, w: 170, h: 110, shape: "diamond", text: "Valid?", color: "#BE7A1B" },
    { id: 4, x: 340, y: 300, w: 190, h: 70, shape: "rounded", text: "Process request", color: "#39456A" },
    { id: 5, x: 20, y: 470, w: 210, h: 66, shape: "ellipse", text: "Show error message", color: "#A03E48" },
    { id: 6, x: 360, y: 470, w: 160, h: 56, shape: "stadium", text: "Done", color: "#2E6F6A" },
  ];
  let edges = [
    { id: 101, from: 1, to: 2, label: "", dashed: false },
    { id: 102, from: 2, to: 3, label: "", dashed: false },
    { id: 103, from: 3, to: 5, label: "no", dashed: false },
    { id: 104, from: 3, to: 4, label: "yes", dashed: false },
    { id: 105, from: 4, to: 6, label: "", dashed: false },
  ];
  let vb = { ...VB0 };
  let selected = null; // {type:'node'|'edge', id}
  let connectMode = false;
  let pendingSrc = null;
  let editingNode = null;
  let nextId = 200;
  let dragState = null; // {id, offX, offY}
  let panState = null; // {clientX, clientY, vbX, vbY}

  const svg = document.getElementById("canvas");
  const edgesLayer = document.getElementById("edgesLayer");
  const nodesLayer = document.getElementById("nodesLayer");
  const panel = document.getElementById("panel");
  const nodeElements = new Map();

  function toCanvas(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const sx = vb.w / rect.width, sy = vb.h / rect.height;
    return { x: vb.x + (clientX - rect.left) * sx, y: vb.y + (clientY - rect.top) * sy };
  }

  // ---------- render ----------
  function updateViewBox() {
    svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  }

  function renderEdges() {
    edgesLayer.innerHTML = "";
    edges.forEach((edge) => {
      const a = nodes.find((n) => n.id === edge.from);
      const b = nodes.find((n) => n.id === edge.to);
      if (!a || !b) return;
      const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
      const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      const dxr = bc.x - ac.x, dyr = bc.y - ac.y;
      const dist = Math.hypot(dxr, dyr) || 1;
      const ux = dxr / dist, uy = dyr / dist;
      const p1o = boundary(a.shape, a.w, a.h, ux, uy);
      const p2o = boundary(b.shape, b.w, b.h, -ux, -uy);
      const p1 = { x: ac.x + p1o.x, y: ac.y + p1o.y };
      const p2 = { x: bc.x + p2o.x, y: bc.y + p2o.y };
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const isSel = selected && selected.type === "edge" && selected.id === edge.id;

      const g = mk("g");
      g.style.cursor = "pointer";
      g.addEventListener("pointerdown", (e) => { e.stopPropagation(); selected = { type: "edge", id: edge.id }; render(); });

      g.appendChild(mk("line", { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: "transparent", "stroke-width": 16 }));
      const line = mk("line", { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: isSel ? ACCENT : "#3A362E", "stroke-width": isSel ? 2.4 : 1.8, "marker-end": "url(#fcarrow)" });
      if (edge.dashed) line.setAttribute("stroke-dasharray", "7 5");
      g.appendChild(line);

      if (edge.label) {
        const w = edge.label.length * 6.8 + 10;
        g.appendChild(mk("rect", { x: mid.x - edge.label.length * 3.4 - 5, y: mid.y - 10, width: w, height: 20, fill: CANVAS_BG, opacity: 0.92 }));
        const text = mk("text", { x: mid.x, y: mid.y + 4, "text-anchor": "middle", "font-size": 12, fill: "#3A362E" });
        text.textContent = edge.label;
        g.appendChild(text);
      }
      edgesLayer.appendChild(g);
    });
  }

  function shapeElementFor(type) {
    if (type === "diamond") return mk("polygon");
    if (type === "ellipse") return mk("ellipse");
    return mk("rect");
  }
  function applyShapeGeometry(shapeEl, type, w, h) {
    if (type === "diamond") {
      shapeEl.setAttribute("points", `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`);
    } else if (type === "ellipse") {
      shapeEl.setAttribute("cx", w / 2); shapeEl.setAttribute("cy", h / 2);
      shapeEl.setAttribute("rx", w / 2); shapeEl.setAttribute("ry", h / 2);
    } else {
      shapeEl.setAttribute("width", w); shapeEl.setAttribute("height", h);
      if (type === "stadium") shapeEl.setAttribute("rx", h / 2);
      else if (type === "rounded") shapeEl.setAttribute("rx", 14);
      else shapeEl.setAttribute("rx", 3);
    }
  }

  function createNodeElement(id) {
    const g = mk("g");
    g.addEventListener("pointerdown", (e) => handleNodeDown(e, id));
    g.addEventListener("dblclick", (e) => handleNodeDblClick(e, id));
    let lastTap = 0;
    g.addEventListener("pointerup", (e) => {
      if (e.pointerType !== "touch") return;
      const now = Date.now();
      if (now - lastTap < 320) handleNodeDblClick(e, id);
      lastTap = now;
    });
    const shapeEl = shapeElementFor("rect");
    g.appendChild(shapeEl);
    const fo = mk("foreignObject");
    const div = document.createElement("div");
    div.className = "fc-node-text";
    div.style.width = "100%"; div.style.height = "100%";
    div.style.display = "flex"; div.style.alignItems = "center"; div.style.justifyContent = "center";
    div.style.textAlign = "center"; div.style.fontSize = "12.5px"; div.style.lineHeight = "1.3";
    div.style.wordBreak = "break-word"; div.style.fontFamily = "inherit";
    div.addEventListener("blur", () => commitNodeText(id, div));
    div.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); div.blur(); } });
    fo.appendChild(div);
    g.appendChild(fo);
    return { g, shapeEl, fo, div, shapeType: "rect" };
  }

  function updateNodeElement(node, refs) {
    refs.g.setAttribute("transform", `translate(${node.x},${node.y})`);
    if (refs.shapeType !== node.shape) {
      const newShapeEl = shapeElementFor(node.shape);
      refs.g.replaceChild(newShapeEl, refs.shapeEl);
      refs.shapeEl = newShapeEl;
      refs.shapeType = node.shape;
    }
    applyShapeGeometry(refs.shapeEl, node.shape, node.w, node.h);

    const isSel = selected && selected.type === "node" && selected.id === node.id;
    const isPending = pendingSrc === node.id;
    const stroke = isPending ? WARN : isSel ? ACCENT : "rgba(0,0,0,0.28)";
    refs.shapeEl.setAttribute("fill", node.color);
    refs.shapeEl.setAttribute("stroke", stroke);
    refs.shapeEl.setAttribute("stroke-width", isSel || isPending ? 2.5 : 1.5);
    if (isPending) refs.shapeEl.setAttribute("stroke-dasharray", "6 4");
    else refs.shapeEl.removeAttribute("stroke-dasharray");

    refs.fo.setAttribute("x", 8); refs.fo.setAttribute("y", 6);
    refs.fo.setAttribute("width", Math.max(0, node.w - 16));
    refs.fo.setAttribute("height", Math.max(0, node.h - 12));
    refs.fo.style.pointerEvents = editingNode === node.id ? "auto" : "none";

    const isEditing = editingNode === node.id;
    refs.div.contentEditable = isEditing ? "true" : "false";
    refs.div.setAttribute("spellcheck", "false");
    refs.div.style.color = textOn(node.color);
    refs.div.style.cursor = isEditing ? "text" : "inherit";
    if (!isEditing && refs.div.textContent !== node.text) refs.div.textContent = node.text;

    refs.g.style.cursor = connectMode ? "crosshair" : "grab";
  }

  function renderNodes() {
    const existingIds = new Set(nodes.map((n) => n.id));
    for (const [id, refs] of nodeElements) {
      if (!existingIds.has(id)) { refs.g.remove(); nodeElements.delete(id); }
    }
    nodes.forEach((node) => {
      let refs = nodeElements.get(node.id);
      if (!refs) { refs = createNodeElement(node.id); nodeElements.set(node.id, refs); nodesLayer.appendChild(refs.g); }
      updateNodeElement(node, refs);
    });
  }

  function iconButton(iconEl, onClick, title) {
    const b = document.createElement("button");
    b.className = "fc-btn fc-icon-btn";
    if (title) b.title = title;
    b.appendChild(iconEl);
    b.addEventListener("click", onClick);
    return b;
  }

  function renderPanel() {
    panel.innerHTML = "";
    const selectedNode = selected && selected.type === "node" ? nodes.find((n) => n.id === selected.id) : null;
    const selectedEdge = selected && selected.type === "edge" ? edges.find((e) => e.id === selected.id) : null;

    if (!selectedNode && !selectedEdge) {
      const wrap = document.createElement("div");
      wrap.className = "fc-panel-empty";
      wrap.textContent = "Select a shape or connector to edit it here.";
      const stats = document.createElement("div");
      stats.className = "fc-panel-stats";
      stats.textContent = `${nodes.length} shapes · ${edges.length} connectors`;
      wrap.appendChild(stats);
      panel.appendChild(wrap);
      return;
    }

    if (selectedNode) {
      const section = document.createElement("div");
      section.className = "fc-panel-section";

      const head = document.createElement("div");
      head.className = "fc-panel-row-between";
      head.style.marginBottom = "0";
      const lbl = document.createElement("div"); lbl.className = "fc-label"; lbl.style.marginBottom = "0"; lbl.textContent = "Shape";
      head.appendChild(lbl);
      head.appendChild(iconButton(trashIcon(), deleteSelected, "Delete"));
      section.appendChild(head);

      const labelBlock = document.createElement("div");
      const subl = document.createElement("div"); subl.className = "fc-sublabel"; subl.textContent = "Label";
      const ta = document.createElement("textarea");
      ta.className = "fc-input"; ta.rows = 2; ta.value = selectedNode.text;
      ta.addEventListener("input", (e) => updateNode(selectedNode.id, { text: e.target.value }, { skipPanel: true }));
      labelBlock.appendChild(subl); labelBlock.appendChild(ta);
      section.appendChild(labelBlock);

      const typeBlock = document.createElement("div");
      const subl2 = document.createElement("div"); subl2.className = "fc-sublabel"; subl2.textContent = "Type";
      const row = document.createElement("div"); row.className = "fc-wrap-row";
      SHAPES.forEach((s) => {
        const b = document.createElement("button");
        b.className = "fc-btn fc-icon-btn" + (selectedNode.shape === s.type ? " fc-active" : "");
        b.title = s.label;
        b.appendChild(shapePreviewSvg(s.type, 24));
        b.addEventListener("click", () => updateNode(selectedNode.id, { shape: s.type }));
        row.appendChild(b);
      });
      typeBlock.appendChild(subl2); typeBlock.appendChild(row);
      section.appendChild(typeBlock);

      const colorBlock = document.createElement("div");
      const subl3 = document.createElement("div"); subl3.className = "fc-sublabel"; subl3.textContent = "Color";
      const crow = document.createElement("div"); crow.className = "fc-wrap-row";
      NODE_COLORS.forEach((c) => {
        const b = document.createElement("button");
        b.className = "fc-btn fc-swatch" + (selectedNode.color === c ? " fc-swatch-active" : "");
        b.style.background = c;
        b.title = c;
        b.addEventListener("click", () => updateNode(selectedNode.id, { color: c }));
        crow.appendChild(b);
      });
      colorBlock.appendChild(subl3); colorBlock.appendChild(crow);
      section.appendChild(colorBlock);

      panel.appendChild(section);
      return;
    }

    if (selectedEdge) {
      const section = document.createElement("div");
      section.className = "fc-panel-section";

      const head = document.createElement("div");
      head.className = "fc-panel-row-between";
      head.style.marginBottom = "0";
      const lbl = document.createElement("div"); lbl.className = "fc-label"; lbl.style.marginBottom = "0"; lbl.textContent = "Connector";
      head.appendChild(lbl);
      head.appendChild(iconButton(trashIcon(), deleteSelected, "Delete"));
      section.appendChild(head);

      const labelBlock = document.createElement("div");
      const subl = document.createElement("div"); subl.className = "fc-sublabel"; subl.textContent = "Label";
      const inp = document.createElement("input");
      inp.type = "text"; inp.className = "fc-input"; inp.placeholder = "e.g. yes / no";
      inp.value = selectedEdge.label;
      inp.addEventListener("input", (e) => updateEdge(selectedEdge.id, { label: e.target.value }, { skipPanel: true }));
      labelBlock.appendChild(subl); labelBlock.appendChild(inp);
      section.appendChild(labelBlock);

      const dashRow = document.createElement("div");
      dashRow.className = "fc-panel-row-between"; dashRow.style.marginBottom = "0";
      const subl2 = document.createElement("div"); subl2.className = "fc-sublabel"; subl2.style.marginBottom = "0"; subl2.textContent = "Dashed line";
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "fc-btn fc-icon-btn" + (selectedEdge.dashed ? " fc-active" : "");
      toggleBtn.style.width = "40px";
      toggleBtn.textContent = selectedEdge.dashed ? "On" : "Off";
      toggleBtn.addEventListener("click", () => updateEdge(selectedEdge.id, { dashed: !selectedEdge.dashed }));
      dashRow.appendChild(subl2); dashRow.appendChild(toggleBtn);
      section.appendChild(dashRow);

      const revBtn = document.createElement("button");
      revBtn.className = "fc-btn fc-btn-block";
      revBtn.textContent = "Reverse direction";
      revBtn.addEventListener("click", () => updateEdge(selectedEdge.id, { from: selectedEdge.to, to: selectedEdge.from }));
      section.appendChild(revBtn);

      panel.appendChild(section);
      return;
    }
  }

  function updateConnectUI() {
    const btn = document.getElementById("btnConnect");
    btn.classList.toggle("fc-active", connectMode);
    document.getElementById("connectState").textContent = connectMode ? "On" : "Off";
    document.getElementById("connectHint").hidden = !connectMode;
  }

  function render() {
    updateViewBox();
    renderNodes();
    renderEdges();
    renderPanel();
    updateConnectUI();
    svg.style.cursor = panState ? "grabbing" : connectMode ? "crosshair" : "default";
  }

  // ---------- mutations ----------
  function updateNode(id, patch, opts) {
    opts = opts || {};
    const idx = nodes.findIndex((n) => n.id === id);
    if (idx < 0) return;
    nodes[idx] = { ...nodes[idx], ...patch };
    if (opts.skipPanel) { renderNodes(); renderEdges(); }
    else render();
  }
  function updateEdge(id, patch, opts) {
    opts = opts || {};
    const idx = edges.findIndex((e) => e.id === id);
    if (idx < 0) return;
    edges[idx] = { ...edges[idx], ...patch };
    if (opts.skipPanel) renderEdges();
    else render();
  }

  function deleteSelected() {
    if (!selected) return;
    if (selected.type === "node") {
      nodes = nodes.filter((n) => n.id !== selected.id);
      edges = edges.filter((e) => e.from !== selected.id && e.to !== selected.id);
    } else {
      edges = edges.filter((e) => e.id !== selected.id);
    }
    selected = null;
    render();
  }

  function addNode(def) {
    const id = nextId++;
    const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2;
    const jitter = (Math.random() - 0.5) * 40;
    nodes.push({ id, x: cx - def.w / 2 + jitter, y: cy - def.h / 2 + jitter, w: def.w, h: def.h, shape: def.type, text: def.label, color: NODE_COLORS[0] });
    selected = { type: "node", id };
    render();
  }

  function handleNodeDown(e, id) {
    e.stopPropagation();
    if (editingNode === id) return;
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    if (e.pointerId != null && e.currentTarget && e.currentTarget.setPointerCapture) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    }
    if (connectMode) {
      if (pendingSrc == null) pendingSrc = id;
      else if (pendingSrc === id) pendingSrc = null;
      else {
        const eid = nextId++;
        edges.push({ id: eid, from: pendingSrc, to: id, label: "", dashed: false });
        pendingSrc = null;
      }
      render();
      return;
    }
    const c = toCanvas(e.clientX, e.clientY);
    dragState = { id, offX: c.x - node.x, offY: c.y - node.y };
    selected = { type: "node", id };
    render();
  }

  function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function handleNodeDblClick(e, id) {
    e.stopPropagation();
    editingNode = id;
    render();
    requestAnimationFrame(() => {
      const refs = nodeElements.get(id);
      if (refs) placeCaretAtEnd(refs.div);
    });
  }

  function commitNodeText(id, div) {
    const text = (div.innerText || "").replace(/\n+$/, "");
    const idx = nodes.findIndex((n) => n.id === id);
    if (idx >= 0) nodes[idx] = { ...nodes[idx], text };
    editingNode = null;
    render();
  }

  function handleBgDown(e) {
    if (connectMode) { pendingSrc = null; selected = null; render(); return; }
    selected = null;
    panState = { clientX: e.clientX, clientY: e.clientY, vbX: vb.x, vbY: vb.y };
    render();
  }

  function zoomBy(factor, cx, cy) {
    const newW = clamp(vb.w * factor, MIN_W, MAX_W);
    const newH = newW * (VB0.h / VB0.w);
    const px = cx != null ? cx : vb.x + vb.w / 2;
    const py = cy != null ? cy : vb.y + vb.h / 2;
    vb = { x: px - (px - vb.x) * (newW / vb.w), y: py - (py - vb.y) * (newH / vb.h), w: newW, h: newH };
    updateViewBox();
  }
  function handleWheel(e) {
    e.preventDefault();
    const c = toCanvas(e.clientX, e.clientY);
    zoomBy(e.deltaY > 0 ? 1.08 : 0.92, c.x, c.y);
  }
  function fitToContent() {
    if (nodes.length === 0) { vb = { ...VB0 }; updateViewBox(); return; }
    const minX = Math.min(...nodes.map((n) => n.x)) - 50;
    const minY = Math.min(...nodes.map((n) => n.y)) - 50;
    const maxX = Math.max(...nodes.map((n) => n.x + n.w)) + 50;
    const maxY = Math.max(...nodes.map((n) => n.y + n.h)) + 50;
    vb = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    updateViewBox();
  }

  // ---------- export ----------
  function bbox() {
    if (nodes.length === 0) return { x: 0, y: 0, w: 1000, h: 650 };
    const minX = Math.min(...nodes.map((n) => n.x)) - 40;
    const minY = Math.min(...nodes.map((n) => n.y)) - 40;
    const maxX = Math.max(...nodes.map((n) => n.x + n.w)) + 40;
    const maxY = Math.max(...nodes.map((n) => n.y + n.h)) + 40;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  function buildExportSVG(scale) {
    const clone = svg.cloneNode(true);
    clone.querySelectorAll("[data-ui]").forEach((el) => el.remove());
    const b = bbox();
    clone.setAttribute("viewBox", `${b.x} ${b.y} ${b.w} ${b.h}`);
    clone.setAttribute("width", Math.round(b.w * scale));
    clone.setAttribute("height", Math.round(b.h * scale));
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return new XMLSerializer().serializeToString(clone);
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  function exportSVGFile() {
    const str = buildExportSVG(1);
    downloadBlob(new Blob(['<?xml version="1.0" standalone="no"?>\r\n' + str], { type: "image/svg+xml;charset=utf-8" }), "flowchart.svg");
  }
  function exportPNGFile() {
    const b = bbox();
    const str = buildExportSVG(2);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = Math.round(b.w * 2); c.height = Math.round(b.h * 2);
      const ctx = c.getContext("2d");
      ctx.fillStyle = CANVAS_BG; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((blob) => downloadBlob(blob, "flowchart.png"), "image/png");
    };
    img.onerror = () => { alert("PNG export failed to render in this browser. Try the SVG export instead."); };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(str)));
  }

  // ---------- init ----------
  function buildShapeToolbar() {
    const container = document.getElementById("shapeButtons");
    SHAPES.forEach((s) => {
      const b = document.createElement("button");
      b.className = "fc-btn fc-shape-btn";
      b.title = `Add ${s.label}`;
      b.appendChild(shapePreviewSvg(s.type, 30, ACCENT));
      const span = document.createElement("span");
      span.className = "fc-shape-label";
      span.textContent = s.label;
      b.appendChild(span);
      b.addEventListener("click", () => addNode(s));
      container.appendChild(b);
    });
  }

  function init() {
    buildShapeToolbar();

    const btnExportSvg = document.getElementById("btnExportSvg");
    btnExportSvg.prepend(downloadIcon());
    btnExportSvg.addEventListener("click", exportSVGFile);

    const btnExportPng = document.getElementById("btnExportPng");
    btnExportPng.prepend(imageIcon());
    btnExportPng.addEventListener("click", exportPNGFile);

    const btnConnect = document.getElementById("btnConnect");
    btnConnect.prepend(link2Icon());
    btnConnect.addEventListener("click", () => { connectMode = !connectMode; pendingSrc = null; render(); });

    document.getElementById("btnZoomIn").appendChild(magnifierIcon(true));
    document.getElementById("btnZoomIn").addEventListener("click", () => zoomBy(0.85));
    document.getElementById("btnZoomOut").appendChild(magnifierIcon(false));
    document.getElementById("btnZoomOut").addEventListener("click", () => zoomBy(1.18));

    const btnFit = document.getElementById("btnFit");
    btnFit.prepend(maximizeIcon());
    btnFit.addEventListener("click", fitToContent);

    svg.addEventListener("wheel", handleWheel, { passive: false });

    // pinch-to-zoom (touch) + background pan/click
    const activeTouches = new Map();
    let pinchStartDist = null, pinchStartVb = null, pinchStartMid = null;
    svg.addEventListener("pointerdown", (e) => {
      if (e.pointerId != null && svg.setPointerCapture) {
        try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      }
      if (e.pointerType === "touch") {
        activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activeTouches.size === 2) {
          dragState = null; panState = null;
          const pts = [...activeTouches.values()];
          pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
          pinchStartVb = { ...vb };
          const midClient = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
          pinchStartMid = toCanvas(midClient.x, midClient.y);
          return;
        }
        if (activeTouches.size > 1) return;
      }
      handleBgDown(e);
    });

    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch" && activeTouches.has(e.pointerId)) {
        activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activeTouches.size === 2 && pinchStartDist) {
          const pts = [...activeTouches.values()];
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
          const factor = pinchStartDist / dist;
          const newW = clamp(pinchStartVb.w * factor, MIN_W, MAX_W);
          const newH = newW * (VB0.h / VB0.w);
          vb = {
            x: pinchStartMid.x - (pinchStartMid.x - pinchStartVb.x) * (newW / pinchStartVb.w),
            y: pinchStartMid.y - (pinchStartMid.y - pinchStartVb.y) * (newH / pinchStartVb.h),
            w: newW, h: newH,
          };
          updateViewBox();
          return;
        }
      }
      if (dragState) {
        const c = toCanvas(e.clientX, e.clientY);
        const idx = nodes.findIndex((n) => n.id === dragState.id);
        if (idx >= 0) {
          nodes[idx] = { ...nodes[idx], x: c.x - dragState.offX, y: c.y - dragState.offY };
          renderNodes(); renderEdges();
        }
      } else if (panState) {
        const rect = svg.getBoundingClientRect();
        const dx = (e.clientX - panState.clientX) * (vb.w / rect.width);
        const dy = (e.clientY - panState.clientY) * (vb.h / rect.height);
        vb = { ...vb, x: panState.vbX - dx, y: panState.vbY - dy };
        updateViewBox();
      }
    });
    window.addEventListener("pointerup", (e) => {
      if (e.pointerType === "touch") {
        activeTouches.delete(e.pointerId);
        if (activeTouches.size < 2) { pinchStartDist = null; pinchStartVb = null; pinchStartMid = null; }
      }
      const wasDragging = !!dragState || !!panState;
      dragState = null; panState = null;
      if (wasDragging) svg.style.cursor = connectMode ? "crosshair" : "default";
    });
    window.addEventListener("pointercancel", (e) => {
      if (e.pointerType === "touch") activeTouches.delete(e.pointerId);
      dragState = null; panState = null;
    });

    window.addEventListener("keydown", (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      const editing = document.activeElement && document.activeElement.isContentEditable;
      if (editing || tag === "INPUT" || tag === "TEXTAREA") {
        if (e.key === "Escape") document.activeElement.blur();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        deleteSelected();
      }
      if (e.key === "Escape") { pendingSrc = null; selected = null; render(); }
    });

    render();
  }

  init();
})();
