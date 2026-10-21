// Read-only CORS proxy for the public TimeTree API (api.timetree.org), which sends no CORS headers.
// Only GETs to the endpoints Deep Roots uses are forwarded, and responses are edge-cached so
// TimeTree's servers see as little traffic from us as possible.

const UPSTREAM = 'https://api.timetree.org';
const ALLOWED_PATH = /^\/(timeline|pairwise|mrca|taxon)\/[^?#]{1,600}$/;
const CACHE_SECONDS = 60 * 60 * 24 * 7;

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim());
  const allow = allowed.includes('*') ? '*' : allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: cors });

    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, upstream: UPSTREAM }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (!ALLOWED_PATH.test(url.pathname)) return new Response('Not found', { status: 404, headers: cors });

    const cache = caches.default;
    const cacheKey = new Request(UPSTREAM + url.pathname, { method: 'GET' });
    let res = await cache.match(cacheKey);
    if (!res) {
      const up = await fetch(UPSTREAM + url.pathname, { headers: { 'User-Agent': 'DeepRoots-proxy/1.0 (educational)' } });
      const body = await up.text();
      res = new Response(body, {
        status: up.status,
        headers: {
          'Content-Type': up.headers.get('Content-Type') || 'application/json; charset=utf-8',
          'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
        },
      });
      if (up.ok) ctx.waitUntil(cache.put(cacheKey, res.clone()));
    }
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  },
};
