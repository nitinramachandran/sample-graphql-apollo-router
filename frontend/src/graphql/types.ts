export type Gender = "MALE" | "FEMALE" | "OTHER";

export type Location = "BANGALORE" | "CHENNAI" | "SALEM" | "HYDERABAD";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  location: Location;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  location: Location;
}

export interface UserSearchInput {
  firstName?: string;
  lastName?: string;
  gender?: Gender;
  location?: Location;
}
