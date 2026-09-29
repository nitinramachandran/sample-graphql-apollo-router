package com.example.userapp.microservice.dto;

import com.example.userapp.microservice.model.Gender;
import com.example.userapp.microservice.model.Location;
import com.example.userapp.microservice.model.User;

public record UserDto(
        Long id,
        String firstName,
        String lastName,
        Gender gender,
        Integer heightCm,
        Integer weightKg,
        Location location
) {
    public static UserDto from(User user) {
        return new UserDto(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getGender(),
                user.getHeightCm(),
                user.getWeightKg(),
                user.getLocation()
        );
    }
}
