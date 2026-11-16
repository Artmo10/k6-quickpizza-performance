#!/usr/bin/env bash
# Ejecuta un escenario con el web dashboard de k6 y guarda los reportes.
# Uso: ./run.sh smoke   (o carga, spike, estres)   [opciones extra de k6]
set -euo pipefail
PRUEBA="${1:?Uso: ./run.sh smoke|carga|spike|estres}"; shift || true
FECHA="$(date +%Y%m%d-%H%M%S)"
mkdir -p reports
export K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_OPEN=true K6_WEB_DASHBOARD_PERIOD=5s
export K6_WEB_DASHBOARD_EXPORT="reports/${PRUEBA}-${FECHA}.html"
k6 run --summary-export "reports/${PRUEBA}-${FECHA}-summary.json" "$@" "scenarios/${PRUEBA}.js"
