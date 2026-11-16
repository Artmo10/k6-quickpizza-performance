// Recorrido completo de un usuario: home → login → recomendar pizza → calificar.
// Todos los escenarios (smoke, carga, spike, estrés) ejecutan este mismo recorrido;
// solo cambia el perfil de carga.
import http from 'k6/http';
import exec from 'k6/execution';
import { BASE_URL } from '../lib/config.js';
import { usuarioDelVU, restriccionPara, usuarios } from '../lib/data.js';
import { obtenerToken, login } from '../lib/auth.js';
import { pensar, duracionFlujo, erroresNegocio } from '../lib/utils.js';
import { abrirHome } from './home.js';
import { recomendarPizza } from './recomendarPizza.js';
import { calificarPizza } from './calificarPizza.js';

// setup(): se ejecuta una sola vez antes de la carga.
// Verifica que el sistema responde y que el login funciona; si no, aborta la prueba
// en lugar de generar miles de errores inútiles.
export function setup() {
  const ping = http.get(`${BASE_URL}/`, { tags: { name: 'setup' } });
  if (ping.status !== 200) {
    exec.test.abort(`El sistema bajo prueba no responde (${BASE_URL} → HTTP ${ping.status})`);
  }
  const fallidos = usuarios.filter((u) => !login(u)).map((u) => u.username);
  if (fallidos.length > 0) {
    exec.test.abort(`Login fallido en setup() para: ${fallidos.join(', ')}; revisa data/usuarios.csv`);
  }
  console.log(`setup OK: ${BASE_URL} responde y el login con CSRF funciona`);
  return {};
}

export function flujoCompleto() {
  const inicio = Date.now();
  const usuario = usuarioDelVU(exec.vu.idInTest);
  const restriccion = restriccionPara(exec.scenario.iterationInTest);

  abrirHome();
  pensar();

  const token = obtenerToken(usuario);
  if (!token) {
    erroresNegocio.add(true);
    pensar();
    return; // sin sesión no tiene sentido continuar esta iteración
  }

  recomendarPizza(token, restriccion);
  pensar();

  calificarPizza(token, restriccion.pizzaCalificar, restriccion.stars);

  duracionFlujo.add(Date.now() - inicio);
  pensar();
}
