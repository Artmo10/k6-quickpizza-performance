// PRUEBA DE ESTRÉS: carga creciente por escalones.
// Objetivo: encontrar el punto donde el rendimiento se degrada.
// Límite máximo de 50 VUs porque QuickPizza es un servicio público compartido.
// Si los errores superan el 10%, la prueba se aborta sola (abortOnFail).
import { SLA_THRESHOLDS, SUMMARY_STATS } from '../lib/config.js';
import { flujoCompleto } from '../flows/flujoCompleto.js';
export { setup } from '../flows/flujoCompleto.js';

const MAX = Number(__ENV.VUS_MAX || 50);
const escalon = (pct) => Math.max(1, Math.round((MAX * pct) / 100));

export const options = {
  scenarios: {
    estres: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: escalon(20) },
        { duration: '1m', target: escalon(20) },
        { duration: '30s', target: escalon(40) },
        { duration: '1m', target: escalon(40) },
        { duration: '30s', target: escalon(60) },
        { duration: '1m', target: escalon(60) },
        { duration: '30s', target: escalon(80) },
        { duration: '1m', target: escalon(80) },
        { duration: '30s', target: MAX },
        { duration: '1m', target: MAX },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { tipo_prueba: 'estres' },
    },
  },
  thresholds: {
    ...SLA_THRESHOLDS,
    http_req_failed: [
      'rate<0.01', // criterio del SLA (se reporta)
      { threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '30s' }, // freno de emergencia
    ],
  },
  summaryTrendStats: SUMMARY_STATS,
};

export default function (data) {
  flujoCompleto(data);
}
