#!/usr/bin/env bash
# Recomposes supergraph.graphql from the running users-subgraph.
# Run this whenever the subgraph schema (subgraphs/users-subgraph/src/main/resources/graphql/schema.graphqls) changes.
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.rover/bin:$PATH"
rover supergraph compose --config ./supergraph-config.yaml --output ./supergraph.graphql --elv2-license accept
echo "Wrote supergraph.graphql"
