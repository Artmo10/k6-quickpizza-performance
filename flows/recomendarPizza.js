import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, DEBUG, TIEMPO_MAX, TIEMPO_MAX_PIZZA } from '../lib/config.js';
import { authHeaders } from '../lib/auth.js';
import { erroresNegocio, pizzasRecomendadas, consistenciaPizza, pizzaCumpleCalorias, jsonSeguro } from '../lib/utils.js';

// Flujo 1: el usuario pide una recomendación de pizza según sus restricciones
// (datos parametrizados desde data/restricciones.csv) y luego abre su detalle.
export function recomendarPizza(token, restriccion) {
  group('02_recomendar_pizza', () => {
    const payload = {
      maxCaloriesPerSlice: restriccion.maxCaloriesPerSlice,
      mustBeVegetarian: restriccion.mustBeVegetarian,
      excludedIngredients: restriccion.excludedIngredients,
      excludedTools: restriccion.excludedTools,
      maxNumberOfToppings: restriccion.maxNumberOfToppings,
      minNumberOfToppings: restriccion.minNumberOfToppings,
    };

    const res = http.post(`${BASE_URL}/api/pizza`, JSON.stringify(payload), {
      headers: authHeaders(token),
      tags: { name: 'POST /api/pizza' },
    });

    const cuerpo = jsonSeguro(res) || {};
    const pizza = cuerpo.pizza;
    const ingredientes = pizza && Array.isArray(pizza.ingredients) ? pizza.ingredients : [];
    // El servidor compara nombres exactos (sensible a mayúsculas), por eso el CSV usa
    // los nombres tal como están en el catálogo: "Pepperoni", "Mushrooms", etc.
    const excluidos = restriccion.excludedIngredients;

    // CORRELACIÓN #3: se extrae el ID de la pizza recomendada
    const pizzaId = pizza && pizza.id !== undefined ? pizza.id : null;

    const ok = check(res, {
      'pizza: status 200': (r) => r.status === 200,
      [`pizza: responde en < ${TIEMPO_MAX_PIZZA} ms`]: (r) => r.timings.duration < TIEMPO_MAX_PIZZA,
      'pizza: devuelve id y nombre': () => pizzaId !== null && !!pizza.name,
      'pizza: tiene ingredientes': () => ingredientes.length > 0,
      // Validaciones de negocio: la recomendación respeta las restricciones pedidas
      'pizza: respeta ingredientes excluidos': () =>
        ingredientes.every((i) => !excluidos.includes(i.name)),
      'pizza: respeta restricción vegetariana': () =>
        !restriccion.mustBeVegetarian || (cuerpo.vegetarian === true && ingredientes.every((i) => i.vegetarian === true)),
      'pizza: respeta herramientas excluidas': () => !pizza || !restriccion.excludedTools.includes(pizza.tool),
    });
    // Calorías: el servidor intenta 10 combinaciones y, si ninguna cumple el máximo,
    // devuelve la última igual. No es un fallo del script sino una regla de negocio
    // del sistema, por eso se mide aparte (métrica pizza_cumple_calorias) y no como check.
    if (typeof cuerpo.calories === 'number') {
      pizzaCumpleCalorias.add(cuerpo.calories <= restriccion.maxCaloriesPerSlice);
    }
    erroresNegocio.add(!ok);
    if (DEBUG) console.log(`[pizza] perfil=${restriccion.perfil} ${res.status} ${res.body}`);
    if (pizzaId === null) return;
    pizzasRecomendadas.add(1);

    // --- Abrir el detalle de la pizza recomendada usando el ID capturado ---
    // Si la petición cae en otra instancia de QuickPizza, puede devolver 404 o una pizza
    // distinta con el mismo ID. Es un comportamiento del sistema (no del script), así que
    // se acepta y se mide en la métrica "consistencia_pizza_detalle".
    const resDetalle = http.get(`${BASE_URL}/api/pizza/${pizzaId}`, {
      headers: authHeaders(token),
      tags: { name: 'GET /api/pizza/{id}' },
      responseCallback: http.expectedStatuses(200, 404),
    });
    const mismaPizza = resDetalle.status === 200 && jsonSeguro(resDetalle, 'name') === pizza.name;
    consistenciaPizza.add(mismaPizza);

    const okDetalle = check(resDetalle, {
      'pizza detalle: status 200 o 404': (r) => r.status === 200 || r.status === 404,
      [`pizza detalle: responde en < ${TIEMPO_MAX} ms`]: (r) => r.timings.duration < TIEMPO_MAX,
    });
    erroresNegocio.add(!okDetalle);
  });
}
