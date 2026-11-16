import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, DEBUG } from '../lib/config.js';
import { authHeaders, invalidarToken } from '../lib/auth.js';
import {
  erroresNegocio,
  calificacionesCreadas,
  consistenciaListar,
  consistenciaActualizar,
  consistenciaEliminar,
  jsonSeguro,
  pensar,
} from '../lib/utils.js';

// Flujo 2: el usuario califica una pizza del catálogo, revisa sus calificaciones,
// cambia de opinión (update) y finalmente la elimina (para no dejar basura en el servidor).
//
// QuickPizza público corre en varias instancias independientes (cada una con su base de
// datos) detrás de un balanceador sin afinidad de sesión. Por eso la calificación creada
// en una instancia puede no existir en la instancia que atiende el listado, el update o
// el delete. Esos casos (no encontrada / HTTP 400) se aceptan como comportamiento del
// sistema y se miden en las métricas consistencia_rating_*; no cuentan como error HTTP.
const params = (headers, name, ...esperados) => ({
  headers,
  tags: { name },
  responseCallback: http.expectedStatuses(...esperados),
});

export function calificarPizza(token, pizzaId, estrellas) {
  const headers = authHeaders(token);

  group('03_calificar_pizza', () => {
    // --- Crear calificación ---
    const resCrear = http.post(
      `${BASE_URL}/api/ratings`,
      JSON.stringify({ pizza_id: pizzaId, stars: estrellas }),
      { headers, tags: { name: 'POST /api/ratings' } }
    );
    if (resCrear.status === 401) invalidarToken();

    // CORRELACIÓN #4: se extrae el ID de la calificación creada
    const ratingId = jsonSeguro(resCrear, 'id');

    const okCrear = check(resCrear, {
      'rating crear: status 201': (r) => r.status === 201,
      'rating crear: devuelve id': () => typeof ratingId === 'number' && ratingId > 0,
      'rating crear: estrellas correctas': (r) => jsonSeguro(r, 'stars') === estrellas,
      'rating crear: pizza correcta': (r) => jsonSeguro(r, 'pizza_id') === pizzaId,
    });
    erroresNegocio.add(!okCrear);
    if (DEBUG) console.log(`[rating crear] ${resCrear.status} ${resCrear.body}`);
    if (!ratingId) return; // sin ID no se puede continuar el flujo
    calificacionesCreadas.add(1);

    // --- Listar calificaciones del usuario ---
    const resListar = http.get(`${BASE_URL}/api/ratings`, { headers, tags: { name: 'GET /api/ratings' } });
    const lista = jsonSeguro(resListar, 'ratings');
    consistenciaListar.add(Array.isArray(lista) && lista.some((x) => x.id === ratingId));

    const okListar = check(resListar, {
      'rating listar: status 200': (r) => r.status === 200,
      'rating listar: devuelve una lista': () => Array.isArray(lista),
    });
    erroresNegocio.add(!okListar);
    if (DEBUG) {
      const ids = Array.isArray(lista) ? lista.map((x) => x.id).join(',') : '-';
      console.log(`[rating listar] ${resListar.status} buscado=${ratingId} ids=${ids}`);
    }

    pensar();

    // --- Actualizar calificación ---
    const nuevasEstrellas = estrellas === 5 ? 4 : estrellas + 1;
    const resActualizar = http.put(
      `${BASE_URL}/api/ratings/${ratingId}`,
      JSON.stringify({ stars: nuevasEstrellas }),
      params(headers, 'PUT /api/ratings/{id}', 200, 400) // tag fijo: evita una métrica por cada ID
    );
    consistenciaActualizar.add(resActualizar.status === 200);
    const okActualizar = check(resActualizar, {
      'rating actualizar: status 200 o 400 (otra instancia)': (r) => r.status === 200 || r.status === 400,
      'rating actualizar: si es 200, estrellas actualizadas': (r) =>
        r.status !== 200 || jsonSeguro(r, 'stars') === nuevasEstrellas,
    });
    erroresNegocio.add(!okActualizar);
    if (DEBUG) console.log(`[rating actualizar] ${resActualizar.status} ${resActualizar.body}`);

    // --- Eliminar calificación ---
    const resEliminar = http.del(
      `${BASE_URL}/api/ratings/${ratingId}`,
      null,
      params(headers, 'DELETE /api/ratings/{id}', 204, 400)
    );
    consistenciaEliminar.add(resEliminar.status === 204);
    const okEliminar = check(resEliminar, {
      'rating eliminar: status 204 o 400 (otra instancia)': (r) => r.status === 204 || r.status === 400,
    });
    erroresNegocio.add(!okEliminar);
    if (DEBUG) console.log(`[rating eliminar] ${resEliminar.status} ${resEliminar.body}`);
  });
}
