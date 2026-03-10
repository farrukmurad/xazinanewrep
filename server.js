const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 4173;
const PUBLIC_DIR = path.join(__dirname, 'public');

const db = {
  workspace: {
    id: 'w1',
    name: "Farrukh Murodov's workspace",
    memberCount: 1,
    credits: 1280,
  },
  projects: Array.from({ length: 12 }, (_, i) => ({
    id: `p${i + 1}`,
    name: i === 5 ? 'UZUM New Year' : 'Untitled',
    editedAt: new Date(Date.now() - i * 86400000 * 7).toISOString(),
    author: 'Farrukh Murodov',
    thumbnail: `https://picsum.photos/seed/flora-${i + 10}/900/500`,
  })),
  models: [
    { id: 'sonnet-4.6', provider: 'Anthropic', label: 'Claude Sonnet 4.6' },
    { id: 'gpt-4.1', provider: 'OpenAI', label: 'GPT-4.1' },
    { id: 'gemini-1.5', provider: 'Google', label: 'Gemini 1.5 Pro' },
    { id: 'nano-banana-pro', provider: 'Flora', label: 'Nano Banana Pro' },
  ],
  graph: {
    id: 'graph-1',
    nodes: [
      { id: 'n1', type: 'text', x: 620, y: 280, title: 'Text', model: 'sonnet-4.6', content: 'Try “An excerpt from a dystopian novel set in the future”' },
      { id: 'n2', type: 'image', x: 980, y: 250, title: 'Image', model: 'nano-banana-pro', content: 'Generated result' },
    ],
    edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
  },
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res, pathname) {
  const filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
    }[ext] || 'text/plain; charset=utf-8';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  if (reqUrl.pathname === '/api/projects' && req.method === 'GET') {
    const q = (reqUrl.searchParams.get('q') || '').toLowerCase();
    const projects = db.projects.filter(p => p.name.toLowerCase().includes(q));
    return sendJson(res, 200, { workspace: db.workspace, projects });
  }

  if (reqUrl.pathname === '/api/models' && req.method === 'GET') {
    return sendJson(res, 200, { models: db.models });
  }

  if (reqUrl.pathname === '/api/graph' && req.method === 'GET') {
    return sendJson(res, 200, db.graph);
  }

  if (reqUrl.pathname === '/api/graph/node' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const input = JSON.parse(body || '{}');
        const node = {
          id: `n${Date.now()}`,
          type: input.type || 'text',
          x: Number(input.x) || 300,
          y: Number(input.y) || 300,
          title: input.type === 'image' ? 'Image' : input.type === 'video' ? 'Video' : 'Text',
          model: 'sonnet-4.6',
          content: input.content || '',
        };
        db.graph.nodes.push(node);
        sendJson(res, 201, node);
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  serveStatic(req, res, reqUrl.pathname);
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
