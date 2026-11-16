// PRUEBA DE CARGA SOSTENIDA (carga nominal).
// Objetivo: validar el SLA (P95 < 500 ms, errores < 1%) con la carga esperada: 20 usuarios concurrentes.
import { SLA_THRESHOLDS, SUMMARY_STATS } from '../lib/config.js';
import { flujoCompleto } from '../flows/flujoCompleto.js';
export { setup } from '../flows/flujoCompleto.js';

const VUS = Number(__ENV.VUS || 20);

export const options = {
  scenarios: {
    carga_nominal: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: VUS }, // rampa de subida
        { duration: '5m', target: VUS }, // carga sostenida
        { duration: '30s', target: 0 }, // rampa de bajada
      ],
      gracefulRampDown: '30s',
      tags: { tipo_prueba: 'carga' },
    },
  },
  thresholds: SLA_THRESHOLDS,
  summaryTrendStats: SUMMARY_STATS,
};

export default function (data) {
  flujoCompleto(data);
}
