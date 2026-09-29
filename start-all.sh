#!/usr/bin/env bash
# Starts microservice (8080), subgraph (4001), router (4000), frontend (5173).
# Logs go to /tmp/*.log. Run ./stop-all.sh to tear everything down.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

# The frontend's toolchain (Vite 8 / rolldown) needs Node >= 20.19; if the
# active `node` is older, fall back to Homebrew's node if present.
FRONTEND_NODE_BIN=""
if [ "$(node -v | sed 's/^v//' | cut -d. -f1-2 | tr -d .)" -lt 2019 ] 2>/dev/null && [ -x /opt/homebrew/bin/node ]; then
  FRONTEND_NODE_BIN="/opt/homebrew/bin"
fi

echo "Starting Java microservice on :8080 ..."
(cd "$ROOT/microservice" && nohup ./mvnw -q spring-boot:run > /tmp/microservice.log 2>&1 &)

echo "Waiting for microservice ..."
timeout 90 bash -c 'until curl -sf http://localhost:8080/api/users >/dev/null; do sleep 2; done'

echo "Starting users-subgraph on :4001 ..."
(cd "$ROOT/subgraphs/users-subgraph" && nohup ./mvnw -q spring-boot:run > /tmp/subgraph.log 2>&1 &)

echo "Waiting for subgraph ..."
timeout 90 bash -c 'until curl -sf -X POST http://localhost:4001/graphql -H "Content-Type: application/json" -d "{\"query\":\"{ __typename }\"}" >/dev/null; do sleep 2; done'

echo "Starting Apollo Router on :4000 (health on :8088) ..."
(cd "$ROOT/router" && nohup ./router --config router.yaml --supergraph supergraph.graphql --dev > /tmp/router.log 2>&1 &)

echo "Waiting for router ..."
timeout 60 bash -c 'until curl -sf http://localhost:8088/health >/dev/null; do sleep 1; done'

echo "Starting frontend on :5173 ..."
(cd "$ROOT/frontend" && PATH="$FRONTEND_NODE_BIN:$PATH" nohup npm run dev > /tmp/frontend.log 2>&1 &)

echo "Waiting for frontend ..."
timeout 60 bash -c 'until curl -sf http://localhost:5173 >/dev/null; do sleep 1; done'

cat <<EOF

All services are up:
  Java microservice : http://localhost:8080/api/users
  Users subgraph     : http://localhost:4001/graphql
  Apollo Router       : http://localhost:4000/  (sandbox at http://localhost:4000)
  Frontend            : http://localhost:5173

Logs: /tmp/microservice.log /tmp/subgraph.log /tmp/router.log /tmp/frontend.log
Stop everything with: ./stop-all.sh
EOF
