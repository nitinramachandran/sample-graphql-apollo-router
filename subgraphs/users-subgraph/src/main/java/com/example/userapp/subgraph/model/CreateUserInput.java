package com.example.userapp.subgraph.model;

public record CreateUserInput(
        String firstName,
        String lastName,
        Gender gender,
        Integer heightCm,
        Integer weightKg,
        Location location
) {
}
