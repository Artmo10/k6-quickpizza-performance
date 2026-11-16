#!/usr/bin/env bash
# Ejecuta un escenario con el web dashboard de k6 y guarda los reportes en reports/.
# Uso: ./run.sh <smoke|carga|spike|estres> [--grafana] [opciones extra de k6]
#   --grafana  además envía las métricas en tiempo real a Prometheus local (http://localhost:9090),
#              para verlas en Grafana. Requiere ./grafana/iniciar-prometheus.sh corriendo.
set -euo pipefail
PRUEBA="${1:?Uso: ./run.sh smoke|carga|spike|estres [--grafana] [opciones de k6]}"; shift || true
FECHA="$(date +%Y%m%d-%H%M%S)"
mkdir -p reports
export K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_OPEN=true K6_WEB_DASHBOARD_PERIOD=5s
export K6_WEB_DASHBOARD_EXPORT="reports/${PRUEBA}-${FECHA}.html"
SALIDA=()
if [ "${1:-}" = "--grafana" ]; then
  shift
  export K6_PROMETHEUS_RW_SERVER_URL="${K6_PROMETHEUS_RW_SERVER_URL:-http://localhost:9090/api/v1/write}"
  export K6_PROMETHEUS_RW_TREND_STATS="p(90),p(95),p(99),avg,min,max"
  SALIDA=(-o experimental-prometheus-rw --tag "testid=${PRUEBA}-${FECHA}")
  echo ">> Enviando métricas a Prometheus: ${K6_PROMETHEUS_RW_SERVER_URL} (testid=${PRUEBA}-${FECHA})"
fi
k6 run --summary-export "reports/${PRUEBA}-${FECHA}-summary.json" ${SALIDA[@]+"${SALIDA[@]}"} "$@" "scenarios/${PRUEBA}.js"
