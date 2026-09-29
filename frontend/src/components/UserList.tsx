import { useQuery } from "@apollo/client/react";
import { LIST_USERS, SEARCH_USERS } from "../graphql/operations";
import type { User, UserSearchInput } from "../graphql/types";

interface Props {
  activeFilter: UserSearchInput | null;
}

export function UserList({ activeFilter }: Props) {
  const isSearching = activeFilter !== null;

  const listResult = useQuery<{ users: User[] }>(LIST_USERS, {
    skip: isSearching,
    fetchPolicy: "cache-and-network",
  });

  const searchResult = useQuery<{ searchUsers: User[] }>(SEARCH_USERS, {
    skip: !isSearching,
    variables: { filter: activeFilter ?? {} },
    fetchPolicy: "network-only",
  });

  const { loading, error } = isSearching ? searchResult : listResult;
  const users = isSearching ? searchResult.data?.searchUsers : listResult.data?.users;

  return (
    <div className="card">
      <h2>{isSearching ? "Search Results" : "All Users"}</h2>

      {loading && <p>Loading...</p>}
      {error && <p className="error">Failed to load users: {error.message}</p>}

      {!loading && !error && (!users || users.length === 0) && <p>No users found.</p>}

      {!loading && !error && users && users.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Gender</th>
              <th>Height (cm)</th>
              <th>Weight (kg)</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.firstName}</td>
                <td>{user.lastName}</td>
                <td>{user.gender}</td>
                <td>{user.heightCm}</td>
                <td>{user.weightKg}</td>
                <td>{user.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
