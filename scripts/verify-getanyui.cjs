// Visual and interaction smoke test against Vite preview; API fixtures are intercepted.
// Optional: PLAYWRIGHT_MODULE points to an external Playwright installation.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const origin = process.env.VERIFY_UI_ORIGIN || 'http://127.0.0.1:45200';
async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', (error) => errors.push(error.message));
    const profile = { id: '11111111-1111-4111-8111-111111111111', username: 'docente_visual', role: 'PROFESOR' };
    await page.route('**/auth/login', (route) => route.fulfill({ json: { accessToken: 'visual-fixture-token', user: profile } }));
    await page.route('**/kahoot-api/quizzes', (route) => route.fulfill({ json: [{ id: '22222222-2222-4222-8222-222222222222', authorId: profile.id, title: 'Mi clase conectada', description: 'Fixture visual: no escribe en ninguna base de datos.', isDemo: false, coverImageUrl: null, createdAt: '2026-11-15T12:00:00Z', updatedAt: '2026-11-15T12:00:00Z' }] }));
    await page.goto(origin + '/login');
    await page.getByLabel('Usuario', { exact: true }).fill('docente_visual');
    await page.getByLabel('Contraseña', { exact: true }).fill('visual-fixture-password');
    const color = await page.locator('.login .card h1').evaluate((element) => getComputedStyle(element).color);
    assert.equal(color, 'rgb(248, 250, 252)', 'Dark theme heading must retain readable contrast');
    await page.screenshot({ path: path.join(process.env.VERIFY_SCREENSHOT_DIR || process.cwd(), 'getanyui-login.png'), fullPage: true });
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.getByRole('heading', { name: '¡Hola, docente_visual!', exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Mi clase conectada', exact: true }).waitFor();
    assert.equal(await page.locator('.reference-brand img').evaluate((image) => image.complete && image.naturalWidth > 0), true);
    await page.screenshot({ path: path.join(process.env.VERIFY_SCREENSHOT_DIR || process.cwd(), 'getanyui-dashboard.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No mobile horizontal overflow');
    await page.screenshot({ path: path.join(process.env.VERIFY_SCREENSHOT_DIR || process.cwd(), 'getanyui-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).first().click();
    await page.getByRole('heading', { name: 'Profelink Kahoot', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => sessionStorage.getItem('token')), null);
    assert.deepEqual(errors, []);
    console.log('PASS GetAnyUI: login, dashboard, logo, logout, heading contrast and 390px mobile layout. API fixtures only; no live game assertion.');
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
