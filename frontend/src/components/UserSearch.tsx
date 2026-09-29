import { useState, type FormEvent } from "react";
import { GENDER_OPTIONS, LOCATION_OPTIONS } from "../graphql/options";
import type { Gender, Location, UserSearchInput } from "../graphql/types";

interface Props {
  onSearch: (filter: UserSearchInput) => void;
  onClear: () => void;
}

const emptyFilter: UserSearchInput = {
  firstName: "",
  lastName: "",
  gender: undefined,
  location: undefined,
};

export function UserSearch({ onSearch, onClear }: Props) {
  const [filter, setFilter] = useState<UserSearchInput>(emptyFilter);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned: UserSearchInput = {
      firstName: filter.firstName?.trim() || undefined,
      lastName: filter.lastName?.trim() || undefined,
      gender: filter.gender || undefined,
      location: filter.location || undefined,
    };
    onSearch(cleaned);
  };

  const handleClear = () => {
    setFilter(emptyFilter);
    onClear();
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Search Users</h2>

      <div className="field-grid">
        <label>
          First name
          <input
            type="text"
            value={filter.firstName ?? ""}
            onChange={(e) => setFilter({ ...filter, firstName: e.target.value })}
            placeholder="Any"
          />
        </label>

        <label>
          Last name
          <input
            type="text"
            value={filter.lastName ?? ""}
            onChange={(e) => setFilter({ ...filter, lastName: e.target.value })}
            placeholder="Any"
          />
        </label>

        <label>
          Gender
          <select
            value={filter.gender ?? ""}
            onChange={(e) =>
              setFilter({ ...filter, gender: (e.target.value || undefined) as Gender | undefined })
            }
          >
            <option value="">Any</option>
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Location
          <select
            value={filter.location ?? ""}
            onChange={(e) =>
              setFilter({ ...filter, location: (e.target.value || undefined) as Location | undefined })
            }
          >
            <option value="">Any</option>
            {LOCATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="button-row">
        <button type="submit">Search</button>
        <button type="button" className="secondary" onClick={handleClear}>
          Clear
        </button>
      </div>
    </form>
  );
}
