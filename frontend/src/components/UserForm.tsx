import { useMutation } from "@apollo/client/react";
import { useState, type FormEvent } from "react";
import { CREATE_USER, LIST_USERS } from "../graphql/operations";
import { GENDER_OPTIONS, HEIGHT_CM_OPTIONS, LOCATION_OPTIONS, WEIGHT_KG_OPTIONS } from "../graphql/options";
import type { CreateUserInput, Gender, Location } from "../graphql/types";

const emptyForm: CreateUserInput = {
  firstName: "",
  lastName: "",
  gender: "MALE",
  heightCm: 170,
  weightKg: 70,
  location: "BANGALORE",
};

export function UserForm() {
  const [form, setForm] = useState<CreateUserInput>(emptyForm);
  const [createUser, { loading, error }] = useMutation(CREATE_USER, {
    refetchQueries: [{ query: LIST_USERS }],
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      return;
    }
    await createUser({ variables: { input: form } });
    setForm(emptyForm);
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Add User</h2>

      <div className="field-grid">
        <label>
          First name
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
        </label>

        <label>
          Last name
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
        </label>

        <label>
          Gender
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
          >
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Height (cm)
          <select
            value={form.heightCm}
            onChange={(e) => setForm({ ...form, heightCm: Number(e.target.value) })}
          >
            {HEIGHT_CM_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h} cm
              </option>
            ))}
          </select>
        </label>

        <label>
          Weight (kg)
          <select
            value={form.weightKg}
            onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })}
          >
            {WEIGHT_KG_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w} kg
              </option>
            ))}
          </select>
        </label>

        <label>
          Location
          <select
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value as Location })}
          >
            {LOCATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save User"}
      </button>

      {error && <p className="error">Failed to save user: {error.message}</p>}
    </form>
  );
}
