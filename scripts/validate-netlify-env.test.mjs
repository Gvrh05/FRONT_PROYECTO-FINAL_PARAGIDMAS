import { describe, expect, it } from 'vitest';
import { validateNetlifyEnv } from './validate-netlify-env.mjs';

const valid = { VITE_API_URL: 'https://game.example.com/kahoot-api', VITE_AUTH_API_URL: 'https://identity.example.com/auth' };
describe('Netlify build configuration', () => {
  it('accepts HTTPS APIs and optional WS origin derived by the client', () => {
    expect(() => validateNetlifyEnv(valid)).not.toThrow();
  });
  it.each([{}, { ...valid, VITE_API_URL: '/kahoot-api' }, { ...valid, VITE_AUTH_API_URL: 'http://localhost:3001/auth' },
    { ...valid, VITE_API_URL: 'https://demo.netlify.app/kahoot-api' }, { ...valid, VITE_WS_URL: 'https://game.example.com/kahoot-api' }])
    ('rejects missing URLs, static frontend URLs and invalid WS paths: %j', (env) => {
      expect(() => validateNetlifyEnv(env)).toThrow('Netlify:');
    });
});
