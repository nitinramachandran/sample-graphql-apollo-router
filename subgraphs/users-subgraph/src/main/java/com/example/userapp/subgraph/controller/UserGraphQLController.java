package com.example.userapp.subgraph.controller;

import com.example.userapp.subgraph.client.MicroserviceClient;
import com.example.userapp.subgraph.model.CreateUserInput;
import com.example.userapp.subgraph.model.User;
import com.example.userapp.subgraph.model.UserSearchInput;
import org.springframework.graphql.data.federation.EntityMapping;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class UserGraphQLController {

    private final MicroserviceClient microserviceClient;

    public UserGraphQLController(MicroserviceClient microserviceClient) {
        this.microserviceClient = microserviceClient;
    }

    @QueryMapping
    public List<User> users() {
        return microserviceClient.listUsers();
    }

    @QueryMapping
    public User user(@Argument String id) {
        return microserviceClient.getUser(id);
    }

    @QueryMapping
    public List<User> searchUsers(@Argument UserSearchInput filter) {
        return microserviceClient.searchUsers(filter.firstName(), filter.lastName(), filter.gender(), filter.location());
    }

    @MutationMapping
    public User createUser(@Argument CreateUserInput input) {
        return microserviceClient.createUser(input);
    }

    @EntityMapping("User")
    public User userEntity(@Argument String id) {
        return microserviceClient.getUser(id);
    }
}
