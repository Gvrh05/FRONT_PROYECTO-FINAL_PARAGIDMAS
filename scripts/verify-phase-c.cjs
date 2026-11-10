// Manual browser verification with installed Edge + native CDP/WebSocket.
// No Playwright installation, no seed, no real secrets printed or persisted.
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const verifyProductionBundle = require('./verify-production.cjs');

const front = path.resolve(__dirname, '..');
const back = path.resolve(front, '../BACKEND_PROYECTO-FINAL-PARADIGMAS');
const { loadLocalConfig, startBackend } = require(path.join(back, 'scripts/phase-b-local.cjs'));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

class CDP {
  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Set();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (pending) {
          clearTimeout(pending.timer);
          this.pending.delete(message.id);
          if (message.error) pending.reject(new Error(message.error.message));
          else pending.resolve(message.result);
        }
      } else for (const handler of this.handlers) handler(message);
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 45000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
    });
  }
  async evaluate(sessionId, expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (result.exceptionDetails) throw new Error(`Browser evaluation failed: ${result.exceptionDetails.text}`);
    return result.result.value;
  }
  async wait(sessionId, expression, description) {
    const deadline = Date.now() + 45000;
    do {
      if (await this.evaluate(sessionId, expression)) return;
      await delay(80);
    } while (Date.now() < deadline);
    throw new Error(`Browser condition timed out: ${description}`);
  }
  async click(sessionId, text, tag = 'button') {
    const expression = `Array.from(document.querySelectorAll(${JSON.stringify(tag)})).find(e => e.textContent.trim() === ${JSON.stringify(text)})`;
    await this.wait(sessionId, `!!(${expression})`, `control ${text}`);
    await this.evaluate(sessionId, `(${expression}).click()`);
  }
  async input(sessionId, id, value) {
    await this.evaluate(sessionId, `(() => {
      const input = document.getElementById(${JSON.stringify(id)});
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
  }
}

async function main() {
  verifyProductionBundle();

  process.chdir(back);
  await loadLocalConfig();
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  // DEV ONLY: isolated verification process uses the PUBLIC sample key, not a real secret.
  process.env.JWT_SECRET = 'super_secret_jwt_key_change_in_production';
  process.env.JWT_ISSUER = 'kahoot-auth-dev';
  process.env.JWT_AUDIENCE = 'kahoot-game';
  process.env.CORS_ORIGIN = origin;
  const backend = await startBackend();
  process.env.VITE_API_URL = backend.base;
  process.env.VITE_WS_URL = backend.base;
  const { createServer } = await import('vite');
  const vite = await createServer({ root: front, server: { host: '127.0.0.1', port, strictPort: true } });
  let browser;
  let cdp;
  try {
    await vite.listen();
    const edge = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const profile = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp', 'opencode', `phase-c-edge-${randomUUID()}`);
    browser = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    const endpoint = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Edge CDP did not start')), 30000);
      browser.once('error', (error) => { clearTimeout(timer); reject(error); });
      browser.stderr.on('data', (chunk) => {
        const match = chunk.toString().match(/DevTools listening on (ws:\/\/\S+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
    });
    const socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    cdp = new CDP(socket);
    const handshakes = new Map();
    const forbiddenRequests = [];
    cdp.handlers.add((message) => {
      if (message.method !== 'Network.requestWillBeSent') return;
      const url = new URL(message.params.request.url);
      if (url.pathname === '/kahoot-api/quizzes') forbiddenRequests.push(url.pathname);
      if (url.pathname === '/socket.io/' && url.searchParams.get('transport') === 'polling' && !url.searchParams.has('sid')) {
        handshakes.set(message.sessionId, (handshakes.get(message.sessionId) ?? 0) + 1);
      }
    });
    async function page() {
      const { browserContextId } = await cdp.send('Target.createBrowserContext');
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId });
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      await cdp.send('Page.enable', {}, sessionId);
      await cdp.send('Runtime.enable', {}, sessionId);
      await cdp.send('Network.enable', {}, sessionId);
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId);
      return sessionId;
    }
    const host = await page();
    const player = await page();
    const navigate = (id, route) => cdp.send('Page.navigate', { url: `${origin}${route}` }, id);
    const text = (part) => `document.body.innerText.includes(${JSON.stringify(part)})`;
    const inProgress = `document.querySelector('[data-testid="session-status"]')?.textContent === 'Partida en curso'`;
    const online = text('Conexión en vivo activa');

    await navigate(host, '/dev-login');
    await cdp.click(host, 'Soy host (test-host-id)');
    await cdp.wait(host, `location.pathname === '/host/create' && !!document.querySelector('select option')`, 'selector propio');
    await cdp.click(host, 'Crear sala');
    await cdp.wait(host, `!!document.querySelector('[data-testid="room-code"]') && ${online}`, 'host conectado');
    const roomCode = await cdp.evaluate(host, `document.querySelector('[data-testid="room-code"]').textContent`);
    const hostToken = await cdp.evaluate(host, `localStorage.getItem('token')`);
    const api = async (suffix = '') => {
      const response = await fetch(`${backend.base}/kahoot-api/game-sessions/${roomCode}${suffix}`, { headers: { Authorization: `Bearer ${hostToken}` } });
      assert.equal(response.status, 200);
      return response.json();
    };
    assert.equal(await cdp.evaluate(host, `Array.from(document.querySelectorAll('button')).find(e => e.textContent === 'Iniciar partida').disabled`), true);
    assert.equal(handshakes.get(host), 1);
    console.log(`PASS host: selector available-quizzes, sala ${roomCode}, host solo no habilita inicio; StrictMode = 1 conexión.`);

    await navigate(player, '/login');
    await cdp.click(player, 'Soy player (test-player-id)');
    await cdp.wait(player, `location.pathname === '/join' && !!document.getElementById('room-code')`, 'formulario join');
    await cdp.input(player, 'room-code', '12x');
    await cdp.click(player, 'Unirse');
    await cdp.wait(player, `document.querySelector('[role="alert"]')?.textContent.includes('6 dígitos')`, 'error código inválido');
    await cdp.input(player, 'room-code', '000000');
    await cdp.click(player, 'Unirse');
    await cdp.wait(player, `document.querySelector('[role="alert"]')?.textContent.includes('no existe')`, 'error sala inexistente');
    await cdp.input(player, 'room-code', roomCode);
    await cdp.input(player, 'player-name', 'Jugador demo');
    await cdp.click(player, 'Unirse');
    await cdp.wait(player, `${online} && !!document.querySelector('[data-testid="participants"]')`, 'player conectado');
    await cdp.wait(host, `Array.from(document.querySelectorAll('button')).some(e => e.textContent === 'Iniciar partida' && !e.disabled)`, 'inicio habilitado por otro conectado');
    assert.equal(handshakes.get(player), 1);
    assert.equal((await api('/participants')).length, 2);
    console.log('PASS player: dos perfiles con JWT client-side, errores legibles, 2 participantes; StrictMode = 1 conexión.');

    await cdp.click(player, 'Salir y buscar otra sala', 'a');
    await cdp.wait(host, `Array.from(document.querySelectorAll('button')).some(e => e.textContent === 'Iniciar partida' && e.disabled)`, 'cleanup al abandonar lobby');
    assert.equal((await api('/participants')).length, 1);
    await cdp.input(player, 'room-code', roomCode);
    await cdp.click(player, 'Unirse');
    await cdp.wait(player, online, 'rejoin después de SPA cleanup');
    await cdp.wait(host, `Array.from(document.querySelectorAll('button')).some(e => e.textContent === 'Iniciar partida' && !e.disabled)`, 'jugador vuelve a estar conectado');
    assert.equal((await api('/participants')).length, 2);
    console.log('PASS cleanup SPA: salida retira presencia y deshabilita inicio; rejoin restaura una sola identidad.');

    // Hold a stale HTTP LOBBY response while WS delivers session-started.
    let paused;
    const pausedResponse = new Promise((resolve) => { paused = resolve; });
    const intercept = (message) => {
      if (message.method === 'Fetch.requestPaused' && message.sessionId === player) paused(message.params.requestId);
    };
    cdp.handlers.add(intercept);
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: `${backend.base}/kahoot-api/game-sessions/${roomCode}`, requestStage: 'Response' }] }, player);
    await cdp.send('Page.reload', {}, player);
    const pausedRequest = await Promise.race([pausedResponse, delay(45000).then(() => { throw new Error('Stale GET was not intercepted'); })]);
    await cdp.wait(player, online, 'reconexión aunque GET esté pendiente');
    await cdp.wait(host, `Array.from(document.querySelectorAll('button')).some(e => e.textContent === 'Iniciar partida' && !e.disabled)`, 'host puede iniciar');
    await cdp.click(host, 'Iniciar partida');
    await cdp.wait(host, inProgress, 'host IN_PROGRESS');
    await cdp.wait(player, inProgress, 'player IN_PROGRESS');
    await cdp.send('Fetch.continueResponse', { requestId: pausedRequest }, player);
    await cdp.send('Fetch.disable', {}, player);
    cdp.handlers.delete(intercept);
    await cdp.evaluate(player, `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    assert.equal(await cdp.evaluate(player, inProgress), true);
    assert.equal((await api()).status, 'IN_PROGRESS');
    console.log('PASS inicio REST → WS en ambos; GET LOBBY atrasado no sobrescribe Partida en curso.');

    const before = await api();
    await cdp.send('Page.reload', {}, player);
    await cdp.wait(player, `${inProgress} && ${online}`, 'reload en IN_PROGRESS');
    assert.equal((await api()).startedAt, before.startedAt);
    assert.equal((await api('/participants')).filter((p) => p.userId === 'test-player-id').length, 1);
    console.log('PASS recarga: conserva sala/startedAt, reemite join y no duplica participantes ni navega al Punto 4.');

    for (const id of [host, player]) {
      assert.equal(await cdp.evaluate(id, `document.documentElement.scrollWidth <= window.innerWidth`), true);
      assert.equal(await cdp.evaluate(id, `Array.from(document.querySelectorAll('button')).every(e => e.getBoundingClientRect().height >= 48)`), true);
      assert.equal(await cdp.evaluate(id, `(() => { const r = document.querySelector('.room-code').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth })()`), true);
    }
    console.log('PASS móvil 320px: sin overflow, código legible y botones >=48px.');

    await cdp.click(player, 'Salir');
    await cdp.wait(player, `location.pathname === '/login' && localStorage.getItem('token') === null`, 'logout');
    await cdp.wait(host, `Array.from(document.querySelectorAll('.participants li')).some(e => !e.textContent.includes('Anfitrión') && e.textContent.includes('Sin conexión'))`, 'presencia offline después de logout');
    assert.equal((await api('/participants')).find((p) => p.userId === 'test-player-id')?.connected, false);
    await cdp.click(player, 'Soy player (test-player-id)');
    await cdp.wait(player, `location.pathname === '/join'`, 'nuevo token');
    await cdp.click(player, 'Crear sala', 'a');
    await cdp.wait(player, text('No hay quizzes. Ejecuta'), 'selector vacío sin fallback');
    assert.equal(forbiddenRequests.length, 0);
    console.log('PASS logout/renovación de identidad y selector vacío explícito; nunca se solicitó GET /quizzes.');

    let capture401;
    const paused401 = new Promise((resolve) => { capture401 = resolve; });
    const intercept401 = (message) => {
      if (message.method === 'Fetch.requestPaused' && message.sessionId === player) capture401(message.params.requestId);
    };
    cdp.handlers.add(intercept401);
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: `${backend.base}/kahoot-api/game-sessions/available-quizzes`, requestStage: 'Response' }] }, player);
    await cdp.evaluate(player, `(() => {
      window.__phaseCValidToken = localStorage.getItem('token');
      localStorage.setItem('token', 'invalid-old-request');
      window.__phaseCPending = import('/src/api/http.ts').then(({http}) => http.get('/game-sessions/available-quizzes').catch(() => null));
    })()`);
    const old401 = await Promise.race([paused401, delay(45000).then(() => { throw new Error('Old 401 was not intercepted'); })]);
    await cdp.evaluate(player, `localStorage.setItem('token', window.__phaseCValidToken)`);
    await cdp.send('Fetch.continueResponse', { requestId: old401 }, player);
    await cdp.send('Fetch.disable', {}, player);
    cdp.handlers.delete(intercept401);
    assert.equal(await cdp.evaluate(player, `window.__phaseCPending.then(() => {
      delete window.__phaseCPending; delete window.__phaseCValidToken;
      return localStorage.getItem('token') !== null && location.pathname === '/host/create';
    })`), true);
    console.log('PASS token actualizado: un 401 atrasado de credenciales viejas no borra la sesión vigente.');

    const secondResponse = await fetch(`${backend.base}/kahoot-api/game-sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hostToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: '7ac9810a-b36c-4c85-8b58-b296434f0110' }),
    });
    assert.equal(secondResponse.status, 201);
    const secondRoom = (await secondResponse.json()).roomCode;
    await cdp.click(player, 'Unirse', 'a');
    await cdp.wait(player, `!!document.getElementById('room-code')`, 'volver al formulario');
    await cdp.input(player, 'room-code', roomCode);
    await cdp.click(player, 'Unirse');
    await cdp.wait(player, `${inProgress} && ${online}`, 'volver a sala iniciada registrada');
    await cdp.evaluate(player, `history.pushState({}, '', '/play/lobby/${secondRoom}'); window.dispatchEvent(new PopStateEvent('popstate'))`);
    await cdp.wait(player, `document.querySelector('[data-testid="room-code"]')?.textContent === '${secondRoom}' && document.querySelector('[data-testid="session-status"]')?.textContent === 'En lobby' && ${online}`, 'cambio de parámetro de sala sin recargar');
    assert.equal((await api('/participants')).find((p) => p.userId === 'test-player-id')?.connected, false);
    const secondStateResponse = await fetch(`${backend.base}/kahoot-api/game-sessions/${secondRoom}`, { headers: { Authorization: `Bearer ${hostToken}` } });
    assert.equal((await secondStateResponse.json()).participants.find((p) => p.userId === 'test-player-id')?.connected, true);
    console.log(`PASS cambio SPA de sala ${roomCode} → ${secondRoom}: se libera presencia anterior y no se mezcla estado.`);

    await cdp.evaluate(host, `localStorage.setItem('token', 'invalid')`);
    await cdp.click(host, 'Crear sala', 'a');
    await cdp.wait(host, `location.pathname === '/login' && localStorage.getItem('token') === null`, '401 limpia auth y redirige');
    assert.equal(await cdp.evaluate(player, `Array.from(document.querySelectorAll('.participants li')).some(e => !e.textContent.includes('Anfitrión') && e.textContent.includes('En línea'))`), true);
    console.log('PASS HTTP 401: limpia token/user, desconecta socket y vuelve a /login.');
    console.log('Verificación de navegador completa; Postgres real, sin seed ni borrado de filas.');
  } finally {
    if (cdp) { try { await cdp.send('Browser.close'); } catch { /* Edge may close transport before replying. */ } cdp.socket.close(); }
    else if (browser) browser.kill();
    await vite.close();
    await backend.stop();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
