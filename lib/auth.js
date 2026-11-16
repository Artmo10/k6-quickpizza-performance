import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, JSON_HEADERS, DEBUG, TIEMPO_MAX } from './config.js';
import { jsonSeguro } from './utils.js';

// Token del VU actual. Cada VU tiene su propia copia de esta variable,
// así que cada usuario virtual inicia sesión una sola vez y reutiliza su token.
let tokenDelVU = null;

// Los usuarios de data/usuarios.csv son cuentas de demostración que QuickPizza trae
// precargadas con un token FIJO. Como el sistema corre en varias instancias con bases de
// datos separadas, solo estas cuentas tienen el mismo token en todas las instancias;
// un usuario registrado por nosotros solo existiría en la instancia que atendió el registro.

// Login igual al del navegador: primero se pide un token CSRF y luego se envía
// junto con las credenciales. El servidor rechaza el login (401) si no coinciden.
export function login(usuario) {
  // --- Paso 1: obtener token CSRF (llega en la cookie "csrf_token") ---
  const resCsrf = http.post(`${BASE_URL}/api/csrf-token`, null, {
    tags: { name: 'POST /api/csrf-token' },
  });

  // CORRELACIÓN #1: se extrae el token CSRF de la cookie Set-Cookie de la respuesta
  const cookieCsrf = resCsrf.cookies.csrf_token;
  const csrf = cookieCsrf && cookieCsrf.length > 0 ? cookieCsrf[0].value : null;

  check(resCsrf, {
    'csrf: status 200': (r) => r.status === 200,
    'csrf: token de 32 caracteres': () => typeof csrf === 'string' && csrf.length === 32,
    [`csrf: responde en < ${TIEMPO_MAX} ms`]: (r) => r.timings.duration < TIEMPO_MAX,
  });

  // --- Paso 2: login enviando el CSRF capturado ---
  const res = http.post(
    `${BASE_URL}/api/users/token/login?set_cookie=true`,
    JSON.stringify({ username: usuario.username, password: usuario.password, csrf: csrf }),
    { headers: JSON_HEADERS, tags: { name: 'POST /api/users/token/login' } }
  );

  // CORRELACIÓN #2: se extrae el token de sesión del cuerpo JSON (JSONPath "token")
  const token = jsonSeguro(res, 'token');

  check(res, {
    'login: status 200': (r) => r.status === 200,
    'login: token de 16 caracteres': () => typeof token === 'string' && token.length === 16,
    [`login: responde en < ${TIEMPO_MAX} ms`]: (r) => r.timings.duration < TIEMPO_MAX,
  });
  if (DEBUG || res.status !== 200) console.log(`[login] ${usuario.username} csrf=${csrf} → ${res.status} ${res.body}`);
  return token;
}

// Devuelve el token del VU; si aún no existe, inicia sesión.
export function obtenerToken(usuario) {
  if (tokenDelVU) return tokenDelVU;
  tokenDelVU = login(usuario);
  return tokenDelVU;
}

// Si el servidor rechaza el token (401), se fuerza un nuevo login en la siguiente iteración.
export function invalidarToken() {
  tokenDelVU = null;
}

export function authHeaders(token) {
  return { ...JSON_HEADERS, Authorization: `Bearer ${token}` };
}
