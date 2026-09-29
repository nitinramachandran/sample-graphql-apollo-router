package com.example.userapp.subgraph.model;

public record User(
        String id,
        String firstName,
        String lastName,
        Gender gender,
        Integer heightCm,
        Integer weightKg,
        Location location
) {
}
