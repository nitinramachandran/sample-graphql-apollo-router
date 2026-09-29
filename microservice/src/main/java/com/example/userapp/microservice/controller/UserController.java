package com.example.userapp.microservice.controller;

import com.example.userapp.microservice.dto.CreateUserRequest;
import com.example.userapp.microservice.dto.UserDto;
import com.example.userapp.microservice.model.Gender;
import com.example.userapp.microservice.model.Location;
import com.example.userapp.microservice.model.User;
import com.example.userapp.microservice.repository.UserRepository;
import com.example.userapp.microservice.repository.UserSpecifications;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<UserDto> listUsers() {
        return userRepository.findAll().stream().map(UserDto::from).toList();
    }

    @GetMapping("/{id}")
    public UserDto getUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User " + id + " not found"));
        return UserDto.from(user);
    }

    @GetMapping("/search")
    public List<UserDto> searchUsers(
            @RequestParam(required = false) String firstName,
            @RequestParam(required = false) String lastName,
            @RequestParam(required = false) Gender gender,
            @RequestParam(required = false) Location location
    ) {
        return userRepository.findAll(UserSpecifications.matching(firstName, lastName, gender, location))
                .stream()
                .map(UserDto::from)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto createUser(@Valid @RequestBody CreateUserRequest request) {
        User user = new User(
                request.firstName(),
                request.lastName(),
                request.gender(),
                request.heightCm(),
                request.weightKg(),
                request.location()
        );
        return UserDto.from(userRepository.save(user));
    }

    @PostMapping("/batch")
    public List<UserDto> getUsersByIds(@RequestBody List<Long> ids) {
        return userRepository.findAllById(ids).stream().map(UserDto::from).toList();
    }
}
