#!/usr/bin/env bash
# Inicia Prometheus con el receptor de "remote write" activado, para que k6 le envíe métricas.
# Uso (desde la raíz del proyecto):  ./grafana/iniciar-prometheus.sh
# Dejar esta terminal abierta mientras se ejecutan las pruebas. Para detenerlo: Ctrl+C
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p prometheus-data
exec prometheus \
  --config.file=prometheus.yml \
  --storage.tsdb.path=prometheus-data \
  --web.enable-remote-write-receiver \
  --web.listen-address=localhost:9090
