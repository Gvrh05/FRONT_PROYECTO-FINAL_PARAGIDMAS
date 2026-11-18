// Isolated QA: real UI + real gateway/service/physics over Socket.IO.
// Account Auth and database repositories are explicit in-memory fixtures.
// No external stack, real passwords, accounts or user rooms are used.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const { randomUUID } = require('node:crypto');
const { createServer } = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const front = path.resolve(__dirname, '..'), backend = path.resolve(front, '../BACKEND_PROYECTO-FINAL-PARADIGMAS');
const fromBackend = createRequire(path.join(backend, 'package.json'));
fromBackend('reflect-metadata');
const express = fromBackend('express');
const { Server } = fromBackend('socket.io');
const load = file => fromBackend(path.join(backend, 'dist', file));
const { GameGateway } = load('modules/game-session/gateways/game.gateway');
const { GameSessionService } = load('modules/game-session/services/game-session.service');
const { GameSessionEvents } = load('modules/game-session/gateways/game-session.events');
const { SessionManager } = load('modules/game-session/engine/session-manager');
const { PublicInvitationsController } = load('modules/game-session/controllers/public-invitations.controller');
const { trajectory, resolveShot } = load('modules/game-session/engine/goal-kick-physics');

async function main() {
  const manager = new SessionManager(), events = new GameSessionEvents();
  const hostId = randomUUID(), playerId = randomUUID(), quizId = randomUUID(), questionId = randomUUID();
  let lastResult;
  const repository = { create: input => input, save: input => Promise.resolve(input), update: (_query, input) => { if (input.result) lastResult = input.result; return Promise.resolve({ affected: 1 }); } };
  const quizzes = { findOneByOwner: () => Promise.resolve({ id: quizId, title: 'QA aislada' }), findAllByOwner: () => Promise.resolve([{ id: quizId, title: 'QA aislada' }]), findOne: () => Promise.resolve({ questions: [{ id: questionId, kind: 'TRUE_FALSE', questionText: 'Trivia conserva sus puntos', imageUrl: null, timeLimitSeconds: 2, options: [{ text: 'Verdadero', isCorrect: true }, { text: 'Falso', isCorrect: false }] }] }) };
  const service = new GameSessionService(manager, quizzes, repository, events);
  const identities = { 'fixture-host': { sub: hostId, name: 'Docente QA', role: 'MASTER' }, 'fixture-player': { sub: playerId, name: 'Jugador QA', role: 'PROFESOR' } };
  const verifier = { verify: token => identities[token] ? Promise.resolve(identities[token]) : Promise.reject(new Error('invalid fixture identity')) };
  const gateway = new GameGateway(service, verifier, events), invitations = new PublicInvitationsController(service);
  const app = express(); app.use(express.json());
  app.post('/auth/login', (req, res) => { const token = req.body.username === 'host_qa' ? 'fixture-host' : req.body.username === 'player_qa' ? 'fixture-player' : ''; if (!token || req.body.password !== 'fixture-only') return res.status(401).json({ message: 'Invalid fixture' }); const identity = identities[token]; res.json({ accessToken: token, user: { id: identity.sub, username: identity.name, role: identity.role } }); });
  const wrap = handler => (req, res) => Promise.resolve().then(() => handler(req, res)).catch(() => res.status(400).json({ message: 'Fixture request rejected' }));
  const identity = req => { const value = identities[(req.headers.authorization || '').replace(/^Bearer /, '')]; if (!value) throw new Error('unauthorized'); return value; };
  app.get('/kahoot-api/quizzes', wrap((req, res) => { identity(req); res.json([]); }));
  app.get('/kahoot-api/game-sessions/available-quizzes', wrap(async (req, res) => res.json(await service.listAvailableQuizzes(identity(req).sub))));
  app.post('/kahoot-api/game-sessions', wrap(async (req, res) => res.status(201).json(await service.createSession(identity(req).sub, req.body.quizId))));
  app.get('/kahoot-api/game-sessions/:code', wrap((req, res) => res.json(service.getSessionByCode(req.params.code, identity(req).sub))));
  app.post('/kahoot-api/game-sessions/:code/join', wrap((req, res) => res.json(service.joinSession({ roomCode: req.params.code, userId: identity(req).sub, name: req.body.name }))));
  app.post('/kahoot-api/game-sessions/:code/start', wrap(async (req, res) => res.json(await service.startSession(req.params.code, identity(req).sub))));
  app.get('/kahoot-api/public/invitations/:id', wrap((req, res) => res.json(invitations.get(req.params.id, req))));
  app.post('/kahoot-api/public/invitations/:id/participants', wrap((req, res) => res.json(invitations.create(req.params.id, req.body, req))));
  const http = createServer(app), sockets = new Server(http), namespace = sockets.of('/game'); gateway.afterInit(namespace);
  namespace.on('connection', client => {
    gateway.handleConnection(client);
    for (const [name, method] of Object.entries({ 'join-session': 'join', 'set-ready': 'ready', 'submit-answer': 'answer', 'next-question': 'next', 'close-voting': 'closeVoting', 'game:start-minigame': 'startGoalKick', 'game:shoot': 'shootGoalKick', 'game:sync': 'syncGoalKick', 'game:cancel': 'cancelGoalKick', 'game:return-lobby': 'returnGoalKick' })) client.on(name, payload => { void gateway[method](client, payload); });
    client.on('disconnect', () => { void gateway.handleDisconnect(client); });
  });
  let vite, browser;
  try {
    await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
    const target = `http://127.0.0.1:${http.address().port}`;
    const { createServer: createVite } = await import(pathToFileURL(path.join(front, 'node_modules/vite/dist/node/index.js')).href);
    vite = await createVite({ root: front, logLevel: 'error', define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/kahoot-api'), 'import.meta.env.VITE_AUTH_API_URL': JSON.stringify('/auth'), 'import.meta.env.VITE_WS_URL': JSON.stringify('') }, server: { host: '127.0.0.1', port: 0, proxy: { '/auth': { target }, '/kahoot-api': { target }, '/socket.io': { target, ws: true } } } });
    await vite.listen();
    const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const errors = [], contexts = await Promise.all([browser.newContext({ viewport: { width: 1440, height: 1000 } }), browser.newContext(), browser.newContext({ viewport: { width: 390, height: 844 } })]);
    const [host, account, guest] = await Promise.all(contexts.map(c => c.newPage()));
    for (const page of [host, account, guest]) page.on('pageerror', e => errors.push(e.message));
    const login = async (page, username) => { await page.goto(origin + '/login'); await page.getByLabel('Usuario', { exact: true }).fill(username); await page.getByLabel('Contraseña', { exact: true }).fill('fixture-only'); await page.getByRole('button', { name: 'Ingresar', exact: true }).click(); await page.waitForURL('**/dashboard'); };
    await login(host, 'host_qa');
    await host.goto(origin + '/host/create');
    await host.getByRole('button', { name: 'Búho científico loco', exact: true }).click();
    await host.getByRole('button', { name: 'Crear sala', exact: true }).click();
    await host.waitForURL('**/host/lobby/*');
    const pin = new URL(host.url()).pathname.split('/').pop(), room = manager.requireSession(pin);
    await login(account, 'player_qa'); await account.goto(origin + '/join');
    await account.getByLabel('Código de sala', { exact: true }).fill(pin);
    await account.getByLabel('Nombre para la sala (opcional)').fill('Jugador QA');
    await account.getByRole('button', { name: 'Búho pirata', exact: true }).click();
    await account.getByRole('button', { name: 'Unirse', exact: true }).click();
    await account.waitForURL('**/play/lobby/*');
    await guest.goto(origin + '/join/' + room.invitationId);
    await guest.getByLabel('Tu nombre', { exact: true }).fill('Invitado QA');
    await guest.getByRole('button', { name: 'Búho astronauta', exact: true }).click();
    await guest.getByRole('button', { name: 'Entrar', exact: true }).click();
    await guest.getByRole('status').filter({ hasText: /^Conectado$/ }).waitFor();
    await host.getByRole('radio', { name: 'Minijuego: Tiro al Arco', exact: true }).check();
    await host.getByRole('button', { name: 'Iniciar Tiro al Arco · 40 s', exact: true }).click();
    await guest.getByRole('button', { name: 'Fijar dirección', exact: true }).waitFor();
    const deadline = room.goalKick.endsAt;
    await guest.getByRole('button', { name: 'Fijar dirección', exact: true }).click();
    await guest.getByRole('button', { name: 'Fijar curva y tirar', exact: true }).click();
    await guest.reload();
    await guest.getByRole('heading', { name: 'Tiro al Arco', exact: true }).waitFor();
    assert.equal(room.goalKick.endsAt, deadline);
    await guest.getByRole('button', { name: 'Fijar dirección', exact: true }).waitFor();
    const player = [...room.goalKick.players.values()].find(s => s.player.playerName === 'Invitado QA');
    const aim = [272, 728].flatMap(x => [-195, -130, -65, 65, 130, 195].map(k => ({ x, k }))).find(p => resolveShot(trajectory(p.x, p.k), player.board.defenders).outcome === 'GOAL');
    await guest.getByLabel('Mostrar hitboxes (desarrollo)').check();
    async function lockWhen(field, value, button) {
      await guest.evaluate(({ field, value, button }) => new Promise((resolve, reject) => {
        const start = performance.now();
        const tick = () => { const canvas = document.querySelector('.goal-kick-scene canvas'); const current = Number(canvas?.dataset[field]); if (Number.isFinite(current) && Math.abs(current - value) < 3) { [...document.querySelectorAll('button')].find(b => b.textContent === button)?.click(); resolve(); } else if (performance.now() - start > 6000) reject(new Error('Aim window unavailable')); else requestAnimationFrame(tick); }; tick();
      }), { field, value, button });
    }
    await lockWhen('aimX', aim.x, 'Fijar dirección');
    await guest.getByRole('button', { name: 'Fijar curva y tirar', exact: true }).waitFor();
    await lockWhen('curve', aim.k, 'Fijar curva y tirar');
    await guest.getByText('¡GOL! +10 puntos', { exact: true }).waitFor();
    assert(player.goals >= 1);
    const metrics = await guest.evaluate(() => new Promise(resolve => { const times = [], start = performance.now(); let last = start; const tick = now => { times.push(now - last); last = now; if (now - start >= 2000) { times.sort((a,b) => a-b); resolve({ frames: times.length, averageMs: times.reduce((a,b) => a+b,0)/times.length, p95Ms: times[Math.floor(times.length*.95)] }); } else requestAnimationFrame(tick); }; requestAnimationFrame(tick); }));
    assert.equal(await guest.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (process.env.VERIFY_SCREENSHOT_DIR) await guest.screenshot({ path: path.join(process.env.VERIFY_SCREENSHOT_DIR, 'goal-kick-mobile.png'), fullPage: true });
    await host.getByRole('button', { name: 'Volver al lobby', exact: true }).waitFor({ timeout: 45000 });
    await host.getByRole('button', { name: 'Volver al lobby', exact: true }).click();
    await host.getByRole('radio', { name: 'Trivia (Verdadero/Falso)', exact: true }).check();
    await host.getByRole('button', { name: 'Comenzar Partida', exact: true }).click();
    await guest.getByRole('button', { name: 'Verdadero', exact: true }).click();
    await guest.getByText('+25 puntos', { exact: true }).waitFor();
    await host.getByRole('button', { name: 'Finalizar partida', exact: true }).click();
    await guest.getByRole('heading', { name: 'Podio de ganadores', exact: true }).waitFor();
    assert.equal(lastResult.scores.find(p => p.playerName === 'Invitado QA').score, 25);
    assert.equal(lastResult.scores.find(p => p.playerName === 'Invitado QA').correctAnswersCount, 1);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ pass: true, coverage: 'real UI + real WS gateway/engine; fixture account Auth/DB; 3 contexts; reload in flight; confirmed goal; 40s deadline; return; trivia regression', viewport: '390x844', engine: 'headless Edge', frameMetrics: metrics }));
  } finally { if (browser) await browser.close(); manager.onModuleDestroy(); if (vite) await vite.close(); await new Promise(resolve => { void sockets.close(() => resolve()); }); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
