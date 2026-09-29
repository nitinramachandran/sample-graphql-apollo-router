# Apollo GraphQL User Directory (local dev stack)

A local, four-service stack:

```
frontend (React + Vite, :5173)
    |  GraphQL over HTTP
    v
router (Apollo Router, :4000)
    |  federated subgraph call
    v
subgraphs/users-subgraph (Spring GraphQL + Apollo Federation, :4001)
    |  REST
    v
microservice (Spring Boot + H2 file DB, :8080)
```

- **microservice/** — Java 25 / Spring Boot 4.1 REST API. Owns persistence
  (H2, file-backed at `microservice/data/usersdb`). Exposes
  `/api/users`, `/api/users/search`, `/api/users/{id}`.
- **subgraphs/users-subgraph/** — Java 25 / Spring Boot 4.1 GraphQL
  federation subgraph. Implements the `User` type (`@key(fields: "id")`)
  and the `Query`/`Mutation` root fields, calling the microservice's REST
  API under the hood.
- **router/** — Apollo Router binary, composed via Rover from the
  subgraph's live schema (`supergraph.graphql`). This is the single
  GraphQL endpoint the frontend talks to.
- **frontend/** — React + TypeScript (Vite) app. Form to add a user
  (first/last name, gender/height/weight/location dropdowns), a list of
  all saved users, and a search form (first name, last name, gender,
  location).

## Prerequisites

- Java 21+ (tested with 25) and Maven (wrapper included, no separate install needed)
- Node.js **>= 20.19** for the frontend tooling (Vite 8 uses native
  rolldown bindings that fail to resolve on older Node 20.x — see
  Troubleshooting below)
- [Rover](https://www.apollographql.com/docs/rover) and the
  [Apollo Router](https://www.apollographql.com/docs/graphos/routing/self-hosted/setup)
  binary — both already installed into `~/.rover/bin` and `router/router`
  respectively by the initial setup. Reinstall with:
  ```bash
  curl -sSL https://rover.apollo.dev/nix/latest | sh
  curl -sSL https://router.apollo.dev/download/nix/latest | sh   # run from router/
  ```

## Run everything

```bash
./start-all.sh   # starts microservice, subgraph, router, frontend in order
./stop-all.sh    # stops them all (kills the listeners on each port)
```

Then open **http://localhost:5173**.

Logs land in `/tmp/microservice.log`, `/tmp/subgraph.log`,
`/tmp/router.log`, `/tmp/frontend.log`.

### Running services individually

```bash
# 1. Microservice
cd microservice && ./mvnw spring-boot:run          # :8080

# 2. Subgraph (needs the microservice running)
cd subgraphs/users-subgraph && ./mvnw spring-boot:run   # :4001

# 3. Router (needs the subgraph running to compose against)
cd router && ./router --config router.yaml --supergraph supergraph.graphql --dev  # :4000

# 4. Frontend
cd frontend && npm run dev                           # :5173
```

## Re-composing the supergraph schema

Whenever `subgraphs/users-subgraph/src/main/resources/graphql/schema.graphqls`
changes, recompose `router/supergraph.graphql` (the subgraph must be
running, since composition introspects it live):

```bash
cd router && ./compose.sh
```

Then restart the router.

## Sample GraphQL operations (via the router, http://localhost:4000/)

```graphql
mutation {
  createUser(input: {
    firstName: "Asha", lastName: "Rao", gender: FEMALE,
    heightCm: 165, weightKg: 58, location: BANGALORE
  }) { id firstName lastName gender heightCm weightKg location }
}

query {
  users { id firstName lastName gender heightCm weightKg location }
}

query {
  searchUsers(filter: { location: BANGALORE, gender: FEMALE }) {
    id firstName lastName location
  }
}
```

Apollo Sandbox is available at http://localhost:4000 when the router runs
with `--dev`.

## Troubleshooting

- **`Cannot find native binding` when running `npm run dev` in
  `frontend/`**: the active Node.js is older than the `^20.19.0` engine
  Vite 8 / rolldown requires, so npm skips installing the right optional
  native binary. Use a newer Node (`brew install node` gives you 20.19+ /
  22+ at `/opt/homebrew/bin/node`), or run
  `PATH="/opt/homebrew/bin:$PATH" npm install && PATH="/opt/homebrew/bin:$PATH" npm run dev`.
- **Router fails with `Address already in use`**: a previous router
  process is still bound to :4000/:8088. `lsof -ti:4000,8088 | xargs kill -9`.
- **Router config errors about `cors.origins`/`allow_methods`**: Router 2.x
  uses a policy-based CORS shape (`cors.policies[].origins`,
  `cors.policies[].methods`, `cors.policies[].allow_headers`) — already
  set up in `router/router.yaml`.
