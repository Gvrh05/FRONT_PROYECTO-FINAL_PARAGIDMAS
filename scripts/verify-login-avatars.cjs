// Read-only browser smoke against running services. Never creates accounts/rooms.
// VERIFY_ENV_FILE supplies DEMO_USER_USERNAME/PASSWORD without logging them.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const origin = process.env.VERIFY_ORIGIN || 'http://localhost:5173';
const labels = ['académico', 'musical', 'real', 'espacial', 'estrella', 'lector', 'artista', 'veloz', 'nocturno', 'brillante'];
async function main() {
  const config = Object.fromEntries(fs.readFileSync(process.env.VERIFY_ENV_FILE, 'utf8').split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)]; }));
  assert(config.DEMO_USER_PASSWORD, 'Missing verification password');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/login');
    await page.getByRole('heading', { name: 'Profelink Kahoot', exact: true }).waitFor();
    await page.locator('.login-official-owl').evaluate(image => image.decode());
    assert(await page.locator('.login-constellations').evaluate(element => getComputedStyle(element).backgroundImage.includes('constellations.svg')));
    const formBox = await page.locator('.login-form-panel').boundingBox();
    const visualBox = await page.locator('.login-visual').boundingBox();
    assert(formBox.x + formBox.width <= visualBox.x, 'Desktop columns must not overlap');
    if (process.env.VERIFY_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.VERIFY_SCREENSHOT_DIR, 'profelink-login-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Mobile login overflows');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.login-official-owl').evaluate(element => getComputedStyle(element).animationName), 'none');
    if (process.env.VERIFY_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.VERIFY_SCREENSHOT_DIR, 'profelink-login-mobile.png'), fullPage: true });
    await page.getByLabel('Usuario', { exact: true }).fill(config.DEMO_USER_USERNAME || 'profesor_test');
    await page.getByLabel('Contraseña', { exact: true }).fill(config.DEMO_USER_PASSWORD);
    await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click();
    assert.equal(await page.getByLabel('Contraseña', { exact: true }).getAttribute('type'), 'text');
    await page.getByRole('button', { name: 'Ocultar contraseña', exact: true }).click();
    const login = page.waitForResponse(response => response.url().endsWith('/auth/login') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    assert((await login).ok(), 'Live login rejected verification credentials');
    await page.waitForURL('**/dashboard');
    await page.goto(origin + '/host/create');
    const selector = page.locator('.avatar-selector');
    await selector.waitFor();
    assert.equal(await selector.locator('svg.profelink-owl').count(), 10);
    for (const label of labels) {
      const button = selector.getByRole('button', { name: `Búho ${label}`, exact: true });
      await button.click();
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      assert.equal(await selector.locator('button[aria-pressed="true"]').count(), 1);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Mobile avatar selector overflows');
    if (process.env.VERIFY_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.VERIFY_SCREENSHOT_DIR, 'profelink-avatar-selector.png'), fullPage: true });
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).first().click();
    assert.equal(await page.evaluate(() => sessionStorage.getItem('token')), null);
    assert.deepEqual(errors, []);
    console.log('PASS live login/logout, password visibility, official logo, constellation background, desktop columns, mobile layout, reduced motion and all 10 SVG avatar selections. No data created.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
