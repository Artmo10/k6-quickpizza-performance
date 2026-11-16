import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL } from '../lib/config.js';
import { erroresNegocio } from '../lib/utils.js';

// Flujo 0: el usuario abre la página principal.
export function abrirHome() {
  group('01_home', () => {
    const res = http.get(`${BASE_URL}/`, { tags: { name: 'GET /' } });
    const ok = check(res, {
      'home: status 200': (r) => r.status === 200,
      'home: contiene QuickPizza': (r) => typeof r.body === 'string' && r.body.toLowerCase().includes('quickpizza'),
      'home: responde en < 500 ms': (r) => r.timings.duration < 500,
    });
    erroresNegocio.add(!ok);
  });
}
