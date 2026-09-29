import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

const routerUrl = import.meta.env.VITE_GRAPHQL_ROUTER_URL ?? "http://localhost:4000/";

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: routerUrl }),
  cache: new InMemoryCache(),
});
