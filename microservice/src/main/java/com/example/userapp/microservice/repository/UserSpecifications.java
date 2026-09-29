package com.example.userapp.microservice.repository;

import com.example.userapp.microservice.model.Gender;
import com.example.userapp.microservice.model.Location;
import com.example.userapp.microservice.model.User;
import org.springframework.data.jpa.domain.Specification;

public final class UserSpecifications {

    private UserSpecifications() {
    }

    public static Specification<User> matching(String firstName, String lastName, Gender gender, Location location) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();
            if (firstName != null && !firstName.isBlank()) {
                predicate = cb.and(predicate, cb.like(cb.lower(root.get("firstName")), "%" + firstName.toLowerCase() + "%"));
            }
            if (lastName != null && !lastName.isBlank()) {
                predicate = cb.and(predicate, cb.like(cb.lower(root.get("lastName")), "%" + lastName.toLowerCase() + "%"));
            }
            if (gender != null) {
                predicate = cb.and(predicate, cb.equal(root.get("gender"), gender));
            }
            if (location != null) {
                predicate = cb.and(predicate, cb.equal(root.get("location"), location));
            }
            return predicate;
        };
    }
}
