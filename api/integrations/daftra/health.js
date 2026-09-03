const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function send(res, status, body) {
  res.statusCode = status;
  for (const [key, value] of Object.entries(JSON_HEADERS)) res.setHeader(key, value);
  res.end(JSON.stringify(body));
}

function normalizeBaseUrl(value) {
  const raw = String(value || '').trim().replace(/\/$/, '');
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    return url.origin + url.pathname.replace(/\/$/, '');
  } catch {
    return null;
  }
}

async function probe(baseUrl, apiKey, path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        APIKEY: apiKey,
      },
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      path,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      path,
      error: error?.name === 'AbortError' ? 'timeout' : 'network_error',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('allow', 'GET');
    return send(res, 405, { connected: false, error: 'method_not_allowed' });
  }

  const baseUrl = normalizeBaseUrl(process.env.DAFTRA_BASE_URL);
  const apiKey = process.env.DAFTRA_API_KEY;

  if (!baseUrl || !apiKey) {
    return send(res, 503, {
      connected: false,
      configured: false,
      missing: [
        !baseUrl ? 'DAFTRA_BASE_URL' : null,
        !apiKey ? 'DAFTRA_API_KEY' : null,
      ].filter(Boolean),
    });
  }

  // Daftra accounts can expose different API generations. Probe read-only endpoints only.
  const candidates = [
    '/v2/api/entity/client/list/1',
    '/v2/api/entity/clients/list/1',
    '/api2/clients.json?limit=1',
  ];

  const attempts = [];
  for (const path of candidates) {
    const result = await probe(baseUrl, apiKey, path);
    attempts.push(result);
    if (result.ok) {
      return send(res, 200, {
        connected: true,
        configured: true,
        provider: 'daftra',
        api_status: result.status,
        endpoint_generation: path.startsWith('/v2/') ? 'v2' : 'legacy',
        checked_at: new Date().toISOString(),
      });
    }

    // A 401/403 proves the host/API is reachable but the credential/permission is wrong;
    // trying more path variants will not make the key valid.
    if (result.status === 401 || result.status === 403) break;
  }

  const reachable = attempts.some((item) => Number.isInteger(item.status));
  const authFailure = attempts.some((item) => item.status === 401 || item.status === 403);

  return send(res, authFailure ? 401 : 502, {
    connected: false,
    configured: true,
    provider: 'daftra',
    reachable,
    error: authFailure ? 'authentication_or_permission_failed' : 'daftra_probe_failed',
    attempts: attempts.map(({ path, status, error }) => ({ path, status, error })),
    checked_at: new Date().toISOString(),
  });
}
