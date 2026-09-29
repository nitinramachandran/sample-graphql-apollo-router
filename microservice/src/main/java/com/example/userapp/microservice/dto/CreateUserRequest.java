package com.example.userapp.microservice.dto;

import com.example.userapp.microservice.model.Gender;
import com.example.userapp.microservice.model.Location;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateUserRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotNull Gender gender,
        @NotNull Integer heightCm,
        @NotNull Integer weightKg,
        @NotNull Location location
) {
}
