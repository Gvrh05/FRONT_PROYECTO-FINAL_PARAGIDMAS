// Netlify has no Nginx/Vite API proxy. Validate before compiling public URLs.
export function validateNetlifyEnv(env) {
  for (const [key, suffix] of [['VITE_API_URL', '/kahoot-api'], ['VITE_AUTH_API_URL', '/auth']]) {
    let url;
    try { url = new URL(env[key]); } catch {
      throw new Error(`Netlify: configura ${key} con la URL HTTPS pública de Railway terminada en ${suffix}.`);
    }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/$/, '') !== suffix ||
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.hostname.endsWith('.railway.internal') || url.hostname.endsWith('.netlify.app')) {
      throw new Error(`Netlify: ${key} debe apuntar a la API pública HTTPS, con sufijo ${suffix}, no a Netlify/localhost ni incluir credenciales.`);
    }
  }
  if (env.VITE_WS_URL?.trim()) {
    let url;
    try { url = new URL(env.VITE_WS_URL); } catch { throw new Error('Netlify: VITE_WS_URL debe ser el origen HTTPS público del backend.'); }
    if (url.protocol !== 'https:' || !['', '/'].includes(url.pathname) || url.search || url.hash || url.username || url.password ||
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.hostname.endsWith('.railway.internal') || url.hostname.endsWith('.netlify.app')) {
      throw new Error('Netlify: VITE_WS_URL debe ser el origen HTTPS público del backend, sin /game ni /kahoot-api.');
    }
  }
}

if (process.env.NETLIFY === 'true') {
  validateNetlifyEnv(process.env);
  console.log('URLs públicas de Auth/API verificadas para Netlify.');
}
