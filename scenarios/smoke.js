// SMOKE TEST: 1 usuario durante 1 minuto.
// Objetivo: confirmar que el script y el sistema funcionan antes de aplicar carga.
import { SLA_THRESHOLDS, SUMMARY_STATS } from '../lib/config.js';
import { flujoCompleto } from '../flows/flujoCompleto.js';
export { setup } from '../flows/flujoCompleto.js';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { tipo_prueba: 'smoke' },
    },
  },
  thresholds: {
    ...SLA_THRESHOLDS,
    http_req_failed: ['rate==0'], // en smoke no se tolera ningún error
    checks: ['rate==1'],
  },
  summaryTrendStats: SUMMARY_STATS,
};

export default function (data) {
  flujoCompleto(data);
}
