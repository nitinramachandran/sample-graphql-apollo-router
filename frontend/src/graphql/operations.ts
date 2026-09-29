import { gql } from "@apollo/client";

export const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    firstName
    lastName
    gender
    heightCm
    weightKg
    location
  }
`;

export const LIST_USERS = gql`
  query ListUsers {
    users {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const SEARCH_USERS = gql`
  query SearchUsers($filter: UserSearchInput!) {
    searchUsers(filter: $filter) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;
