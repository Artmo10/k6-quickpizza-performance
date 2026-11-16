# Evaluación de rendimiento de QuickPizza con Grafana k6

Trabajo final del módulo Testing de Performance, Diplomado en Testing de Software V6 (UCB).

**Sistema bajo prueba:** [QuickPizza](https://quickpizza.grafana.com), una aplicación pública de demostración mantenida por Grafana Labs.
**Observabilidad:** métricas en tiempo real enviadas a Prometheus y visualizadas en un dashboard propio de Grafana (ambos locales, ver más abajo), más el web dashboard integrado de k6 (`http://localhost:5665`) y un reporte HTML exportado por ejecución.

## Flujos críticos

| # | Flujo | Endpoints |
|---|---|---|
| 0 | Abrir la página principal | `GET /` |
| 1 | Inicio de sesión con CSRF (una vez por VU) | `POST /api/csrf-token`, `POST /api/users/token/login` |
| 2 | Recomendación de pizza según restricciones | `POST /api/pizza` |
| 3 | Calificar la pizza (CRUD) | `POST`, `GET /api/ratings`, `PUT`, `DELETE /api/ratings/{id}` |

## Estructura

```
data/        usuarios.csv (credenciales), restricciones.csv (datos del formulario de pizza)
lib/         config.js (URL, SLA/thresholds), data.js (SharedArray), auth.js (login + token), utils.js (métricas propias)
flows/       home.js, recomendarPizza.js, calificarPizza.js, flujoCompleto.js (recorrido del usuario + setup)
scenarios/   smoke.js, carga.js, spike.js, estres.js (solo cambia el perfil de carga)
reports/     reporte HTML y resumen JSON de cada ejecución
capturas/    capturas de los dashboards
grafana/     prometheus.yml, iniciar-prometheus.sh y dashboard-k6-quickpizza.json (Grafana local)
```

## Cómo se cumplen los requisitos

| Requisito | Dónde |
|---|---|
| Parametrización con SharedArray | `lib/data.js`: dos CSV cargados una sola vez y compartidos entre los VUs |
| Correlación | (1) token CSRF de la cookie → login; (2) `token` de sesión → header `Authorization`; (3) `pizza.id` recomendado → `GET /api/pizza/{id}`; (4) `id` de la calificación → `PUT`/`DELETE /api/ratings/{id}` |
| Checks (estado, tiempo, contenido, negocio) | `flows/*.js`: códigos HTTP, tiempo de respuesta, contenido de la página, y que la pizza respete los ingredientes excluidos, la restricción vegetariana y las herramientas excluidas. Las calorías y la consistencia de datos se miden como métricas propias (`pizza_cumple_calorias`, `consistencia_*`) |
| Thresholds | `lib/config.js`: P95 < 500 ms, P99 < 1 s, errores < 1 %, checks > 99 %, más P95 por endpoint; `estres.js` aborta si los errores superan el 10 % |

## Instalación

Solo se necesita **k6 v0.49 o superior** (el web dashboard viene incluido) y **Google Chrome** para ver el dashboard.

| | macOS (Terminal) | Windows (PowerShell) |
|---|---|---|
| Instalar k6 | `brew install k6` | `winget install k6 --source winget` |
| Verificar | `k6 version` | `k6 version` |

En Windows, cierra y vuelve a abrir PowerShell después de instalar para que reconozca el comando `k6`. Otras formas de instalación: https://grafana.com/docs/k6/latest/set-up/install-k6/

## Ejecución

Todos los comandos se corren **desde la carpeta raíz del proyecto** (`k6-quickpizza`).

### 1. Con los scripts de atajo (recomendado)

Los scripts `run.sh` (macOS) y `run.ps1` (Windows) ejecutan `k6 run` con el web dashboard activado y guardan automáticamente en `reports/` el reporte HTML y el resumen JSON, con fecha y hora en el nombre.

| Prueba | macOS | Windows |
|---|---|---|
| Smoke (1 VU, 1 min) | `./run.sh smoke` | `.\run.ps1 smoke` |
| Carga (20 VUs, ~7 min) | `./run.sh carga` | `.\run.ps1 carga` |
| Spike (5 → 50 VUs, ~5 min) | `./run.sh spike` | `.\run.ps1 spike` |
| Estrés (hasta 50 VUs, ~9 min) | `./run.sh estres` | `.\run.ps1 estres` |
| Estrés con 100 VUs | `./run.sh estres -e VUS_MAX=100` | `.\run.ps1 estres -e VUS_MAX=100` |

Solo la primera vez:

- **macOS:** dar permiso de ejecución con `chmod +x run.sh`. Si aparece "Operation not permitted", usar `bash run.sh smoke` o quitar la marca de descarga con `xattr -dr com.apple.quarantine .`
- **Windows:** si aparece "la ejecución de scripts está deshabilitada en este sistema", usar `powershell -ExecutionPolicy Bypass -File .\run.ps1 smoke`, o habilitarlo para el usuario con `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### 2. Sin scripts (comando k6 directo)

Equivale a lo que hacen los scripts. Cambia `carga` por la prueba que quieras.

macOS:

```bash
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=reports/carga.html \
k6 run --summary-export reports/carga-summary.json scenarios/carga.js
```

Windows (PowerShell):

```powershell
$env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="reports/carga.html"
k6 run --summary-export reports/carga-summary.json scenarios/carga.js
```

Para una ejecución rápida sin dashboard ni reportes: `k6 run scenarios/smoke.js` (igual en ambos sistemas).

### 3. Ver el dashboard en vivo

1. Al iniciar la prueba, abrir en Chrome `http://127.0.0.1:5665`. La pestaña que se abre sola a veces queda en blanco porque se abre antes de que haya datos; en ese caso, recargarla o abrir una nueva.
2. Pestañas del dashboard: **Overview** (VUs, peticiones por segundo, fallos), **Timings** (latencias P90/P95/P99) y **Summary** (tabla final).
3. **Al terminar, cerrar la pestaña del dashboard.** Mientras esté abierta, k6 no termina: no muestra el resumen final en la terminal ni guarda el reporte.
4. El reporte HTML queda en `reports/` y se puede abrir en Chrome en cualquier momento, con las mismas gráficas.

### 4. Opciones

Se agregan al final del comando, en ambos sistemas:

| Opción | Efecto |
|---|---|
| `-e VUS=30` | Usuarios de la prueba de carga (por defecto 20) |
| `-e VUS_BASE=5 -e VUS_PICO=60` | Usuarios base y de pico del spike |
| `-e VUS_MAX=100` | Usuarios máximos del estrés (por defecto 50) |
| `-e DEBUG=true` | Imprime las respuestas del servidor (usar solo con smoke) |
| `-e BASE_URL=http://localhost:3333` | Probar otra instancia de QuickPizza (por ejemplo, una local) |

> QuickPizza es un servicio público compartido. Grafana recomienda no hacer pruebas de alta carga, por eso la carga máxima por defecto está limitada a 50 VUs y los escenarios incluyen think time.

## Observabilidad con Grafana local (macOS, sin Docker)

Las métricas se envían en tiempo real a Prometheus y se visualizan en Grafana, ambos instalados localmente con Homebrew (sin Docker).

1. Instalar (una sola vez): `brew install prometheus grafana`
2. Iniciar Grafana: `brew services start grafana`. Queda en http://localhost:3000 (usuario `admin`, contraseña `admin`).
3. En otra terminal, desde la raíz del proyecto, iniciar Prometheus y dejar esa terminal abierta: `./grafana/iniciar-prometheus.sh`
4. En Grafana: Connections → Data sources → Add data source → Prometheus, con URL `http://localhost:9090` → Save & test.
5. En Grafana: Dashboards → New → Import → Upload dashboard JSON file → elegir `grafana/dashboard-k6-quickpizza.json` → seleccionar el data source Prometheus → Import. Es un dashboard propio con RPS, VUs, latencias P90/P95/P99, P95 por endpoint, tasa de errores, checks y consistencia de datos.
6. Ejecutar la prueba con la opción `--grafana`: `./run.sh estres --grafana -e VUS_MAX=100` (en Windows: `.\run.ps1 estres --grafana -e VUS_MAX=100`).

La opción `--grafana` envía las métricas con `-o experimental-prometheus-rw`, exporta los percentiles P90, P95 y P99, y etiqueta la ejecución con `testid=<prueba>-<fecha>` para filtrarla en el dashboard. Las duraciones llegan a Prometheus en segundos.

## Hallazgo: consistencia de datos en la instancia pública

QuickPizza público responde desde varias instancias independientes, cada una con su propia base de datos, sin afinidad de sesión. Una calificación creada en una instancia puede no existir en la que atiende la petición siguiente: aparece como HTTP 400 "not found" en el update o el delete, o no figura en el listado. Si el token no existe en esa instancia, se atiende como usuario anónimo global.

Esos casos se aceptan como comportamiento del sistema (no cuentan como error HTTP) y se miden en las métricas `consistencia_pizza_detalle` y `consistencia_rating_listar`, `_actualizar` y `_eliminar`. Por eso se usan las cuentas de demostración precargadas (`studio-user`, `synthetics_multihttp_example`), que tienen el mismo token fijo en todas las instancias.

## Resultados (15-nov-2026)

| Prueba | VUs máx | Peticiones | RPS | P95 | P99 | Máx | Errores | Checks |
|---|---|---|---|---|---|---|---|---|
| Smoke | 1 | 56 | 0,9 | 189 ms | 240 ms | 251 ms | 0% | 100% |
| Carga | 20 | 5.386 | 13,5 | 225 ms | 251 ms | 262 ms | 0% | 100% |
| Spike | 50 | 3.612 | 12,6 | 224 ms | 252 ms | 294 ms | 0% | 100% |
| Estrés | 50 | 10.605 | 21,8 | 223 ms | 252 ms | 326 ms | 0% | 100% |
| Estrés | 100 | 21.275 | 43,7 | 224 ms | 252 ms | 374 ms | 0% | 100% |
| Estrés con Grafana | 100 | 21.268 | 43,6 | 221 ms | 249 ms | 347 ms | 0% | 100% |

Todos los thresholds se cumplieron. Los reportes HTML (abrir en Chrome) y los resúmenes JSON de cada ejecución están en `reports/`. Las capturas de los dashboards están en `capturas/` (las de Grafana empiezan con `grafana-`).
