package com.example.userapp.subgraph.model;

public record UserSearchInput(
        String firstName,
        String lastName,
        Gender gender,
        Location location
) {
}
