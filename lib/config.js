// Configuración común para todos los escenarios.
// Se puede cambiar la URL sin tocar código:  k6 run -e BASE_URL=http://localhost:3333 ...
export const BASE_URL = __ENV.BASE_URL || 'https://quickpizza.grafana.com';

export const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Tiempo de "pensar" del usuario entre pasos (segundos). Simula a una persona real
// y evita martillar un servidor público compartido.
export const THINK_MIN = Number(__ENV.THINK_MIN || 1);
export const THINK_MAX = Number(__ENV.THINK_MAX || 3);

// Muestra en consola el cuerpo de las respuestas (solo para depurar con 1 VU).
export const DEBUG = __ENV.DEBUG === 'true';

// Criterios de éxito (SLA). Se reutilizan en todos los escenarios.
export const SLA_THRESHOLDS = {
  // Globales
  http_req_failed: ['rate<0.01'], // < 1% de errores HTTP
  http_req_duration: ['p(95)<500', 'p(99)<1000'], // P95 < 500 ms, P99 < 1 s
  checks: ['rate>0.99'], // > 99% de validaciones OK

  // Por endpoint (usando el tag "name")
  'http_req_duration{name:GET /}': ['p(95)<500'],
  'http_req_duration{name:POST /api/users/token/login}': ['p(95)<500'],
  'http_req_duration{name:POST /api/pizza}': ['p(95)<800'],
  'http_req_duration{name:GET /api/pizza/{id}}': ['p(95)<500'],
  'http_req_duration{name:POST /api/ratings}': ['p(95)<500'],
  'http_req_duration{name:GET /api/ratings}': ['p(95)<500'],
  'http_req_duration{name:PUT /api/ratings/{id}}': ['p(95)<500'],
  'http_req_duration{name:DELETE /api/ratings/{id}}': ['p(95)<500'],

  // Métricas propias
  errores_negocio: ['rate<0.01'],
};

// Tiempo máximo aceptable por petición, usado en los checks de tiempo de respuesta (ms).
// Coincide con los thresholds P95 por endpoint.
export const TIEMPO_MAX = 500;
export const TIEMPO_MAX_PIZZA = 800;

// Estadísticas que se muestran en el resumen final de la consola.
export const SUMMARY_STATS = ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'];
