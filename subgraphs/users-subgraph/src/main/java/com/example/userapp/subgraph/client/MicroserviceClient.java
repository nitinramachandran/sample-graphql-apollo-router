package com.example.userapp.subgraph.client;

import com.example.userapp.subgraph.model.CreateUserInput;
import com.example.userapp.subgraph.model.Gender;
import com.example.userapp.subgraph.model.Location;
import com.example.userapp.subgraph.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

@Component
public class MicroserviceClient {

    private final RestClient restClient;

    public MicroserviceClient(RestClient.Builder restClientBuilder,
                               @Value("${microservice.base-url}") String baseUrl) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
    }

    public List<User> listUsers() {
        RemoteUser[] users = restClient.get()
                .uri("/api/users")
                .retrieve()
                .body(RemoteUser[].class);
        return toUsers(users);
    }

    public User getUser(String id) {
        RemoteUser user = restClient.get()
                .uri("/api/users/{id}", id)
                .retrieve()
                .body(RemoteUser.class);
        return user == null ? null : toUser(user);
    }

    public List<User> searchUsers(String firstName, String lastName, Gender gender, Location location) {
        var uriBuilder = UriComponentsBuilder.fromPath("/api/users/search");
        if (firstName != null) uriBuilder.queryParam("firstName", firstName);
        if (lastName != null) uriBuilder.queryParam("lastName", lastName);
        if (gender != null) uriBuilder.queryParam("gender", gender);
        if (location != null) uriBuilder.queryParam("location", location);

        RemoteUser[] users = restClient.get()
                .uri(uriBuilder.build().toUriString())
                .retrieve()
                .body(RemoteUser[].class);
        return toUsers(users);
    }

    public User createUser(CreateUserInput input) {
        RemoteUser created = restClient.post()
                .uri("/api/users")
                .body(new RemoteCreateUserRequest(
                        input.firstName(),
                        input.lastName(),
                        input.gender(),
                        input.heightCm(),
                        input.weightKg(),
                        input.location()
                ))
                .retrieve()
                .body(RemoteUser.class);
        return toUser(created);
    }

    private List<User> toUsers(RemoteUser[] remoteUsers) {
        return remoteUsers == null ? List.of() : List.of(remoteUsers).stream().map(this::toUser).toList();
    }

    private User toUser(RemoteUser remoteUser) {
        return new User(
                String.valueOf(remoteUser.id()),
                remoteUser.firstName(),
                remoteUser.lastName(),
                remoteUser.gender(),
                remoteUser.heightCm(),
                remoteUser.weightKg(),
                remoteUser.location()
        );
    }

    private record RemoteUser(
            Long id,
            String firstName,
            String lastName,
            Gender gender,
            Integer heightCm,
            Integer weightKg,
            Location location
    ) {
    }

    private record RemoteCreateUserRequest(
            String firstName,
            String lastName,
            Gender gender,
            Integer heightCm,
            Integer weightKg,
            Location location
    ) {
    }
}
