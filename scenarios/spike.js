// SPIKE TEST: pico repentino de usuarios.
// Objetivo: ver cómo reacciona el sistema ante un salto brusco (de 5 a 50 VUs en 10 s)
// y si se recupera cuando el pico termina.
import { SLA_THRESHOLDS, SUMMARY_STATS } from '../lib/config.js';
import { flujoCompleto } from '../flows/flujoCompleto.js';
export { setup } from '../flows/flujoCompleto.js';

const BASE = Number(__ENV.VUS_BASE || 5);
const PICO = Number(__ENV.VUS_PICO || 50);

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: BASE }, // tráfico normal
        { duration: '1m', target: BASE },
        { duration: '10s', target: PICO }, // ¡pico!
        { duration: '1m', target: PICO }, // se mantiene el pico
        { duration: '10s', target: BASE }, // caída brusca
        { duration: '1m30s', target: BASE }, // ¿se recupera?
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { tipo_prueba: 'spike' },
    },
  },
  thresholds: SLA_THRESHOLDS,
  summaryTrendStats: SUMMARY_STATS,
};

export default function (data) {
  flujoCompleto(data);
}
