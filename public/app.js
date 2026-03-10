const app = document.getElementById('app');

const state = { route: 'projects', projects: [], workspace: null, graph: null, models: [], drag: null };

function formatDate(iso){ return new Date(iso).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }); }

async function loadProjects(q=''){
  const r = await fetch(`/api/projects?q=${encodeURIComponent(q)}`);
  const d = await r.json();
  state.projects = d.projects; state.workspace = d.workspace;
}
async function loadGraph(){ state.graph = await (await fetch('/api/graph')).json(); }
async function loadModels(){ state.models = (await (await fetch('/api/models')).json()).models; }

function shell(content){
  return `
  <div class="layout">
    <aside class="sidebar">
      <div><strong>${state.workspace?.name || 'Workspace'}</strong><div class="small">${state.workspace?.memberCount || 1} Member</div></div>
      <button class="btn" data-nav="projects">Projects</button>
      <button class="btn" data-nav="editor">Canvas Editor</button>
      <div class="small">Credits: ${state.workspace?.credits ?? 0}</div>
    </aside>
    <main class="main">${content}</main>
  </div>`;
}

function projectsView(){
  return shell(`
    <div class="row">
      <h2 style="margin:0">All</h2>
      <div class="topnav">
        <input id="search" class="search" placeholder="Search" />
        <button class="btn">Invite</button>
        <button class="btn green">New project</button>
      </div>
    </div>
    <div class="card-grid">
      ${state.projects.map(p => `<article class="card"><img src="${p.thumbnail}" alt="${p.name}" /><div class="meta"><div><strong>${p.name}</strong></div><div class="small">Edited ${formatDate(p.editedAt)} by ${p.author}</div></div></article>`).join('')}
    </div>
  `);
}

function canvasView(){
  return shell(`
    <div class="canvas-wrap" id="canvas">
      <div class="canvas-toolbar">
        <button class="pill" id="addText">+ Text</button>
        <button class="pill" id="addImage">+ Image</button>
        <button class="pill" id="addVideo">+ Video</button>
      </div>
      <div class="float">
        <strong>Generate</strong>
        <div class="small" style="margin:8px 0">Model</div>
        <select id="model" class="search" style="min-width:0;width:100%">${state.models.map(m => `<option>${m.label}</option>`).join('')}</select>
      </div>
      ${state.graph.nodes.map(n => `<section class="node" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px"><div class="title">${n.title}</div><div class="small">${n.model}</div><p>${n.content || ''}</p></section>`).join('')}
    </div>
  `);
}

function bindCommon(){
  document.querySelectorAll('[data-nav]').forEach(b => b.onclick = async () => { state.route = b.dataset.nav; await render(); });
}

function bindProjects(){
  const search = document.getElementById('search');
  search?.addEventListener('input', async e => { await loadProjects(e.target.value); render(); });
}

function addNode(type){
  fetch('/api/graph/node', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ type, x: 240 + Math.random()*500, y:200 + Math.random()*320, content:`${type} node`})})
    .then(() => loadGraph()).then(() => render());
}

function bindCanvas(){
  document.getElementById('addText').onclick = () => addNode('text');
  document.getElementById('addImage').onclick = () => addNode('image');
  document.getElementById('addVideo').onclick = () => addNode('video');

  document.querySelectorAll('.node').forEach(node => {
    node.onmousedown = e => {
      state.drag = { id: node.dataset.id, offsetX: e.offsetX, offsetY: e.offsetY };
    };
  });

  document.onmousemove = e => {
    if (!state.drag) return;
    const n = state.graph.nodes.find(x => x.id === state.drag.id);
    if (!n) return;
    const rect = document.getElementById('canvas').getBoundingClientRect();
    n.x = e.clientX - rect.left - state.drag.offsetX;
    n.y = e.clientY - rect.top - state.drag.offsetY;
    const el = document.querySelector(`[data-id="${n.id}"]`);
    if (el){ el.style.left = `${n.x}px`; el.style.top = `${n.y}px`; }
  };
  document.onmouseup = () => { state.drag = null; };
}

async function render(){
  app.innerHTML = state.route === 'editor' ? canvasView() : projectsView();
  bindCommon();
  if (state.route === 'editor') bindCanvas(); else bindProjects();
}

(async function init(){
  await Promise.all([loadProjects(), loadModels(), loadGraph()]);
  render();
})();
