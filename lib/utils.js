import { sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { THINK_MIN, THINK_MAX } from './config.js';

// Métricas personalizadas (aparecen en el resumen y en el web dashboard)
export const erroresNegocio = new Rate('errores_negocio');
// Duración del recorrido completo de un usuario, INCLUYE el think time
export const duracionFlujo = new Trend('duracion_flujo_completo', true);
export const pizzasRecomendadas = new Counter('pizzas_recomendadas');
export const calificacionesCreadas = new Counter('calificaciones_creadas');
// --- Métricas de CONSISTENCIA de datos ---
// QuickPizza público corre en varias instancias independientes detrás de un balanceador,
// cada una con su propia base de datos. Una petición puede caer en una instancia distinta
// a la anterior y no "ver" lo que se acaba de crear. Estas métricas miden ese efecto.
export const consistenciaPizza = new Rate('consistencia_pizza_detalle');
// % de recomendaciones que respetan el máximo de calorías pedido
export const pizzaCumpleCalorias = new Rate('pizza_cumple_calorias');
export const consistenciaListar = new Rate('consistencia_rating_listar');
export const consistenciaActualizar = new Rate('consistencia_rating_actualizar');
export const consistenciaEliminar = new Rate('consistencia_rating_eliminar');

export function pensar() {
  sleep(THINK_MIN + Math.random() * (THINK_MAX - THINK_MIN));
}

// res.json() lanza excepción si el cuerpo no es JSON (p. ej. un 429 o 502 en HTML).
// Esta función devuelve null en vez de romper la iteración.
export function jsonSeguro(res, selector) {
  try {
    return selector ? res.json(selector) : res.json();
  } catch (e) {
    return null;
  }
}
