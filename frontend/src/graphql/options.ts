import type { Gender, Location } from "./types";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

export const LOCATION_OPTIONS: { value: Location; label: string }[] = [
  { value: "BANGALORE", label: "Bangalore" },
  { value: "CHENNAI", label: "Chennai" },
  { value: "SALEM", label: "Salem" },
  { value: "HYDERABAD", label: "Hyderabad" },
];

export const HEIGHT_CM_OPTIONS: number[] = Array.from(
  { length: 210 - 140 + 1 },
  (_, i) => 140 + i
);

export const WEIGHT_KG_OPTIONS: number[] = Array.from(
  { length: 150 - 40 + 1 },
  (_, i) => 40 + i
);
