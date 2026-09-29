# Build a GraphQL App with Apollo Router, Spring Boot and React — From Scratch

*A beginner-friendly, step-by-step tutorial. No prior GraphQL knowledge needed.*

By the end you will have a small **User Directory** web app running on your own computer. You can add people (name, gender, height, weight, city), see everyone in a table, and search by name, gender or city.

The finished code is here: <https://github.com/nitinramachandran/sample-graphql-apollo-router>. If you get stuck, compare your files with it.

---

## 1. The big picture (in plain English)

Think of a restaurant.

| Restaurant | Our app | What it does |
|---|---|---|
| The **customer** | **Frontend** (React) | The web page you click on. |
| The **head waiter** at the front door | **Apollo Router** | Takes every order from the customer and sends it to the right place. Customers only ever talk to this one person. |
| A **section waiter** | **Subgraph** (Spring Boot) | Knows how to handle "user" orders. Speaks the head waiter's language (GraphQL). |
| The **kitchen and pantry** | **Microservice** (Spring Boot + database) | Actually stores and fetches the data. |

The request travels like this:

```
 Browser page (React)            http://localhost:5173
        │   GraphQL
        ▼
 Apollo Router                   http://localhost:4000
        │   GraphQL
        ▼
 Users Subgraph (Spring Boot)    http://localhost:4001/graphql
        │   REST (plain web calls)
        ▼
 Users Microservice (Spring Boot + H2 database)   http://localhost:8080
```

### Words you will meet

- **REST API** – the traditional way programs talk over the web: one web address per kind of thing (`/api/users`). You get back a fixed shape of data.
- **GraphQL** – a newer way. There is **one** address, and the caller writes a small "order form" (a *query*) saying exactly which fields they want. Nothing more, nothing less.
- **Query** – a GraphQL request that *reads* data. **Mutation** – one that *changes* data (like adding a user).
- **Schema** – the menu. It lists everything you may ask for and what shape it has.
- **Subgraph** – one GraphQL service that owns part of the menu. Big companies have many subgraphs, run by different teams.
- **Supergraph** – all the subgraph menus merged into one big menu. The router serves this.
- **Federation** – Apollo's name for "many subgraphs behind one router".
- **Apollo Router** – a ready-made program (you download it, you don't code it) that serves the supergraph.
- **Rover** – Apollo's command-line tool. We use it to merge subgraph menus into the supergraph.
- **Spring Boot** – a Java toolkit that lets you build web servers quickly.
- **H2** – a tiny database that lives in a file on your disk. No installation needed.

> **Why so many layers for such a small app?** Honestly, you would not need them for this app. We do it to *learn* the architecture that large companies use. Once you understand this, adding a second subgraph (say "orders") is easy.

---

## 2. What you need installed

| Tool | Version | Check with |
|---|---|---|
| Java (JDK) | 21 or newer (we used 25) | `java -version` |
| Node.js | **20.19 or newer** | `node -v` |
| curl | any | `curl --version` |
| A code editor | e.g. VS Code, IntelliJ | — |

You do **not** need to install Maven; Spring projects come with a helper called `./mvnw`.

Make a folder for the whole project:

```bash
mkdir apollo-graphql && cd apollo-graphql
```

We will create four things inside it: `microservice/`, `subgraphs/users-subgraph/`, `router/` and `frontend/`.

---

## 3. Step 1 — The Microservice (the kitchen and pantry)

This service stores users in a database and offers plain REST web addresses:

| Address | Meaning |
|---|---|
| `GET /api/users` | list everyone |
| `GET /api/users/{id}` | one person |
| `GET /api/users/search?firstName=..&gender=..` | filtered list |
| `POST /api/users` | add a person |

### 3.1 Generate the project

Spring has a website that generates a starter project. Run this in your `apollo-graphql` folder (or use <https://start.spring.io> and pick the same options):

```bash
curl https://start.spring.io/starter.zip \
  -d type=maven-project -d language=java \
  -d groupId=com.example.userapp -d artifactId=microservice \
  -d name=microservice -d packageName=com.example.userapp.microservice \
  -d javaVersion=25 \
  -d dependencies=web,data-jpa,h2,validation \
  -o microservice.zip
unzip microservice.zip -d microservice && rm microservice.zip
```

If your Java is older than 25, change `javaVersion` to what you have (21 is fine).

What those dependencies give us:

- `web` – lets the app answer web requests.
- `data-jpa` – lets us save Java objects to a database without writing SQL.
- `h2` – the tiny file-based database.
- `validation` – lets us reject bad input (like an empty name).

Optionally, add the H2 web console (a page to peek into the database). Check your generated `pom.xml`; the project we built also lists `spring-boot-h2console`. It is a nice-to-have, not essential.

### 3.2 Configure it

Open `microservice/src/main/resources/` and rename `application.properties` to `application.yml`, then replace its contents:

```yaml
server:
  port: 8080

spring:
  application:
    name: microservice
  datasource:
    url: jdbc:h2:file:./data/usersdb;AUTO_SERVER=TRUE
    driver-class-name: org.h2.Driver
    username: sa
    password: ""
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
  h2:
    console:
      enabled: true
      path: /h2-console
```

Plain English:

- `port: 8080` – the door number this service listens on.
- `jdbc:h2:file:./data/usersdb` – store the database in a file at `microservice/data/usersdb`. Your data survives restarts.
- `ddl-auto: update` – "create the table for me if it is missing". You never write `CREATE TABLE`.

### 3.3 The building blocks

All files below go under `microservice/src/main/java/com/example/userapp/microservice/`.

**Two "pick-lists"** (Java calls them *enums*). They restrict values to a fixed set.

`model/Gender.java`
```java
package com.example.userapp.microservice.model;

public enum Gender {
    MALE,
    FEMALE,
    OTHER
}
```

`model/Location.java`
```java
package com.example.userapp.microservice.model;

public enum Location {
    BANGALORE,
    CHENNAI,
    SALEM,
    HYDERABAD
}
```

**The User "entity"** – a Java class that maps to a database table called `users`. Each field becomes a column.

`model/User.java`
```java
package com.example.userapp.microservice.model;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String firstName;

    private String lastName;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    private Integer heightCm;

    private Integer weightKg;

    @Enumerated(EnumType.STRING)
    private Location location;

    public User() {
    }

    public User(String firstName, String lastName, Gender gender, Integer heightCm, Integer weightKg, Location location) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.gender = gender;
        this.heightCm = heightCm;
        this.weightKg = weightKg;
        this.location = location;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public Gender getGender() { return gender; }
    public void setGender(Gender gender) { this.gender = gender; }

    public Integer getHeightCm() { return heightCm; }
    public void setHeightCm(Integer heightCm) { this.heightCm = heightCm; }

    public Integer getWeightKg() { return weightKg; }
    public void setWeightKg(Integer weightKg) { this.weightKg = weightKg; }

    public Location getLocation() { return location; }
    public void setLocation(Location location) { this.location = location; }
}
```

What the labels mean:

- `@Entity` / `@Table` – "this class is a database table".
- `@Id` + `@GeneratedValue` – "`id` is the unique number; the database assigns it".
- `@Enumerated(EnumType.STRING)` – store `"BANGALORE"` as text rather than a number like `0`. Easier to read, and safe if you reorder the enum later.

**DTOs** (*Data Transfer Objects*) are the shapes we send in and out over the web. We keep them separate from the database class so we control exactly what is exposed.

`dto/CreateUserRequest.java` — what a client must send to create a user:
```java
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
```

`@NotBlank` means "cannot be empty or spaces"; `@NotNull` means "must be provided". A `record` is Java's short way of writing a plain data holder.

`dto/UserDto.java` — what we send back:
```java
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
```

**The repository** — the object that talks to the database. Notice it has *no code inside*. Spring writes it for us.

`repository/UserRepository.java`
```java
package com.example.userapp.microservice.repository;

import com.example.userapp.microservice.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
}
```

`JpaRepository` gives us `save`, `findAll`, `findById` for free. `JpaSpecificationExecutor` lets us build flexible searches.

**The search rules.** A "specification" is a set of optional conditions. Only the filters the user filled in are applied. Name matching ignores upper/lower case and matches partial text ("ash" finds "Asha").

`repository/UserSpecifications.java`
```java
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
```

`cb.conjunction()` starts with "match everything", and each `and(...)` narrows it down.

**The controller** — the front desk that maps web addresses to actions.

`controller/UserController.java`
```java
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
```

Reading it: `@GetMapping` = "answer when someone *reads* this address"; `@PostMapping` = "answer when someone *sends* data"; `@Valid` = "check the input against the rules in `CreateUserRequest`". The last method, `/batch`, is a bonus that fetches several users by id at once.

The generated `MicroserviceApplication.java` (with `@SpringBootApplication`) is already there; leave it alone.

### 3.4 Run and test it

```bash
cd microservice
./mvnw spring-boot:run
```

The first run downloads libraries, so give it a minute. Leave it running and open a **second terminal**:

```bash
# add a user
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Asha","lastName":"Rao","gender":"FEMALE","heightCm":165,"weightKg":58,"location":"BANGALORE"}'

# list users
curl http://localhost:8080/api/users

# search
curl "http://localhost:8080/api/users/search?location=BANGALORE"
```

Try posting with a blank `firstName`. You should get an error back; that is the validation working.

✅ **Checkpoint:** you can add and list users over plain REST. Stop the server with `Ctrl+C` when you like (or keep it running for the next step).

---

## 4. Step 2 — The Users Subgraph (the section waiter)

This service speaks GraphQL to the outside and REST to the microservice. It stores nothing itself; it just translates.

### 4.1 Generate the project

Back in the top `apollo-graphql` folder:

```bash
mkdir subgraphs && cd subgraphs
curl https://start.spring.io/starter.zip \
  -d type=maven-project -d language=java \
  -d groupId=com.example.userapp -d artifactId=users-subgraph \
  -d name=users-subgraph -d packageName=com.example.userapp.subgraph \
  -d javaVersion=25 \
  -d dependencies=graphql,web,validation \
  -o users-subgraph.zip
unzip users-subgraph.zip -d users-subgraph && rm users-subgraph.zip
```

Now add one more library that adds the Apollo Federation vocabulary. Open `users-subgraph/pom.xml` and add this inside `<dependencies>`:

```xml
<dependency>
    <groupId>com.apollographql.federation</groupId>
    <artifactId>federation-graphql-java-support</artifactId>
    <version>5.4.0</version>
</dependency>
```

### 4.2 Configure it

Replace `src/main/resources/application.properties` with `application.yml`:

```yaml
server:
  port: 4001

spring:
  application:
    name: users-subgraph
  graphql:
    graphiql:
      enabled: true
    cors:
      allowed-origins: "*"
      allowed-methods: "*"
      allowed-headers: "*"

microservice:
  base-url: http://localhost:8080
```

- Port `4001` so it doesn't clash with the microservice on `8080`.
- `graphiql` – a built-in playground page at <http://localhost:4001/graphiql> where you can try queries by hand.
- `microservice.base-url` – where to find the kitchen.

### 4.3 The schema (the menu)

Create the folder `src/main/resources/graphql/` and inside it the file `schema.graphqls`. **This file is the heart of GraphQL.** Read it slowly.

```graphql
extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

type User @key(fields: "id") {
    id: ID!
    firstName: String!
    lastName: String!
    gender: Gender!
    heightCm: Int!
    weightKg: Int!
    location: Location!
}

enum Gender {
    MALE
    FEMALE
    OTHER
}

enum Location {
    BANGALORE
    CHENNAI
    SALEM
    HYDERABAD
}

input CreateUserInput {
    firstName: String!
    lastName: String!
    gender: Gender!
    heightCm: Int!
    weightKg: Int!
    location: Location!
}

input UserSearchInput {
    firstName: String
    lastName: String
    gender: Gender
    location: Location
}

type Query {
    "List every saved user"
    users: [User!]!
    "Search saved users by any combination of filters"
    searchUsers(filter: UserSearchInput!): [User!]!
    "Fetch a single user by id"
    user(id: ID!): User
}

type Mutation {
    createUser(input: CreateUserInput!): User!
}
```

How to read it:

- `type User { ... }` – describes a user and its fields.
- `!` means **required** (never empty). `String!` = a required text. `[User!]!` = a required list that contains only real users.
- `ID` – a unique identifier, sent as text.
- `enum` – a fixed pick-list, just like in Java.
- `input` – a shape used for *sending* data in (the form the caller fills out).
- `type Query` – all the "read" questions anyone may ask: `users`, `searchUsers`, `user`.
- `type Mutation` – all the "change" actions: `createUser`.
- `@key(fields: "id")` and the `extend schema @link` line – Apollo Federation extras. `@key` says "a user can be uniquely looked up by its `id`". Later, other subgraphs could add fields to `User` by using this key. The router needs it to stitch things together.

### 4.4 The Java pieces

Files go under `src/main/java/com/example/userapp/subgraph/`.

**Models.** These mirror the schema. Copy `Gender` and `Location` enums exactly as in the microservice, but with the package `com.example.userapp.subgraph.model`:

`model/Gender.java`
```java
package com.example.userapp.subgraph.model;

public enum Gender {
    MALE,
    FEMALE,
    OTHER
}
```

`model/Location.java`
```java
package com.example.userapp.subgraph.model;

public enum Location {
    BANGALORE,
    CHENNAI,
    SALEM,
    HYDERABAD
}
```

`model/User.java` (note that `id` is a `String` here, because GraphQL `ID` is text):
```java
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
```

`model/CreateUserInput.java`
```java
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
```

`model/UserSearchInput.java`
```java
package com.example.userapp.subgraph.model;

public record UserSearchInput(
        String firstName,
        String lastName,
        Gender gender,
        Location location
) {
}
```

Spring automatically matches names: GraphQL type `User` ⇄ Java record `User`, field by field.

**The client that calls the microservice.** This is the section waiter walking to the kitchen.

`client/MicroserviceClient.java`
```java
package com.example.userapp.subgraph.client;

import com.example.userapp.subgraph.model.CreateUserInput;
import com.example.userapp.subgraph.model.Gender;
import com.example.userapp.subgraph.model.Location;
import com.example.userapp.subgraph.model.User;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

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
```

The two little `Remote...` records describe what the microservice sends and expects. `toUser` converts the numeric id to text for GraphQL.

**The federation switch.** This small config turns on the Apollo Federation features and provides the `RestClient.Builder` used above.

`config/FederationConfig.java`
```java
package com.example.userapp.subgraph.config;

import org.springframework.boot.graphql.autoconfigure.GraphQlSourceBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.graphql.data.federation.FederationSchemaFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class FederationConfig {

    @Bean
    public FederationSchemaFactory federationSchemaFactory() {
        return new FederationSchemaFactory();
    }

    @Bean
    public GraphQlSourceBuilderCustomizer federationTransform(FederationSchemaFactory factory) {
        return builder -> builder.schemaFactory(factory::createGraphQLSchema);
    }

    @Bean
    public RestClient.Builder restClientBuilder() {
        return RestClient.builder();
    }
}
```

**The controller.** Each method answers one item from the menu.

`controller/UserGraphQLController.java`
```java
package com.example.userapp.subgraph.controller;

import com.example.userapp.subgraph.client.MicroserviceClient;
import com.example.userapp.subgraph.model.CreateUserInput;
import com.example.userapp.subgraph.model.User;
import com.example.userapp.subgraph.model.UserSearchInput;
import java.util.List;
import org.springframework.graphql.data.federation.EntityMapping;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

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
```

The magic is in the names. A method called `users` marked `@QueryMapping` automatically answers the `users` field of `type Query` in the schema. `@MutationMapping` does the same for `type Mutation`. `@Argument` receives whatever the caller sent.

`@EntityMapping("User")` is the federation part: when the router says "give me the User whose id is 7", this method answers.

### 4.5 Run and test it

Make sure the microservice is still running on 8080, then start the subgraph in a new terminal:

```bash
cd subgraphs/users-subgraph
./mvnw spring-boot:run
```

Visit <http://localhost:4001/graphiql> and paste this on the left, then press ▶:

```graphql
query {
  users {
    id
    firstName
    location
  }
}
```

You should see the user you created earlier. Notice you asked for only three fields and received only three.

✅ **Checkpoint:** GraphQL works against your microservice.

---

## 5. Step 3 — The Apollo Router (the head waiter)

The router is a program you **download**, not write. You only give it two files: a config (`router.yaml`) and the merged menu (`supergraph.graphql`).

### 5.1 Install Rover and the Router

```bash
mkdir router && cd router
curl -sSL https://rover.apollo.dev/nix/latest | sh
curl -sSL https://router.apollo.dev/download/nix/latest | sh
```

- Rover installs into `~/.rover/bin/`. Add that to your PATH or use the full path.
- The router binary is downloaded into the current folder (`router/router`).

(Windows users: see the Apollo docs for install commands, or use WSL.)

### 5.2 Tell Rover where the subgraph is

Create `router/supergraph-config.yaml`:

```yaml
federation_version: =2.9.3
subgraphs:
  users:
    routing_url: http://localhost:4001/graphql
    schema:
      subgraph_url: http://localhost:4001/graphql
```

- `users` – a nickname for our subgraph.
- `routing_url` – where the router will send requests for it.
- `subgraph_url` – where Rover can *ask the running subgraph for its menu*. (This is why the subgraph must be running.)

### 5.3 Merge the menus ("compose")

Create `router/compose.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.rover/bin:$PATH"
rover supergraph compose --config ./supergraph-config.yaml --output ./supergraph.graphql --elv2-license accept
echo "Wrote supergraph.graphql"
```

Make it runnable and run it (with the subgraph running):

```bash
chmod +x compose.sh
./compose.sh
```

Open the new `supergraph.graphql`. It is a longer version of your schema with extra directives for the router. You don't edit it by hand. **Whenever you change `schema.graphqls`, re-run `./compose.sh` and restart the router.**

### 5.4 Configure the router

Create `router/router.yaml`:

```yaml
supergraph:
  listen: 0.0.0.0:4000
  introspection: true

sandbox:
  enabled: true

homepage:
  enabled: false

cors:
  policies:
    - origins:
        - http://localhost:5173
      allow_credentials: false
      methods:
        - GET
        - POST
        - OPTIONS
      allow_headers:
        - Content-Type
        - Authorization

health_check:
  listen: 0.0.0.0:8088
  enabled: true
```

- `listen: 0.0.0.0:4000` – the router's public door.
- `sandbox` – a playground page at <http://localhost:4000> (works when started with `--dev`).
- **CORS** – a browser safety rule. A web page on one address (`localhost:5173`) is not allowed to call another address (`localhost:4000`) unless the second one says "I allow that page". The `cors` block says exactly that.
- `health_check` – a tiny address (`:8088/health`) to check the router is alive.

### 5.5 Start the router

```bash
./router --config router.yaml --supergraph supergraph.graphql --dev
```

Open <http://localhost:4000>, and run the same `users` query again. It now goes **Router → Subgraph → Microservice → Database** and back.

Try adding a user with a mutation:

```graphql
mutation {
  createUser(input: {
    firstName: "Ravi", lastName: "Kumar", gender: MALE,
    heightCm: 175, weightKg: 72, location: CHENNAI
  }) {
    id
    firstName
  }
}
```

And a search:

```graphql
query {
  searchUsers(filter: { location: BANGALORE, gender: FEMALE }) {
    id firstName lastName location
  }
}
```

✅ **Checkpoint:** the whole back end works. Only the web page is left.

---

## 6. Step 4 — The Frontend (the customer's menu card)

We use **React** (builds web pages from small reusable pieces called *components*), **TypeScript** (JavaScript with safety checks), **Vite** (a fast dev server) and **Apollo Client** (a library that sends GraphQL requests and keeps the results tidy).

### 6.1 Create the project

From the top `apollo-graphql` folder:

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install @apollo/client graphql
```

Vite generates some demo files. We will replace the important ones. You can delete `src/assets/react.svg` and any demo code.

Create `frontend/.env`:

```
VITE_GRAPHQL_ROUTER_URL=http://localhost:4000/
```

Variables starting with `VITE_` are made available to your browser code. This one is the router's address.

### 6.2 Connect to the router

`src/lib/apolloClient.ts` (create the `lib` folder)
```ts
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

const routerUrl = import.meta.env.VITE_GRAPHQL_ROUTER_URL ?? "http://localhost:4000/";

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: routerUrl }),
  cache: new InMemoryCache(),
});
```

This creates the messenger. It knows the router's address and keeps a memory (`cache`) of answers it has already received.

`src/main.tsx` — wraps the whole app so every component can use the messenger:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ApolloProvider } from "@apollo/client/react";
import "./index.css";
import App from "./App.tsx";
import { apolloClient } from "./lib/apolloClient";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <App />
    </ApolloProvider>
  </StrictMode>
);
```

### 6.3 Describe the data and the requests

`src/graphql/types.ts` — the TypeScript twins of our schema, so the editor can catch typos:
```ts
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
```

`src/graphql/operations.ts` — the actual "order forms" the page sends:
```ts
import { gql } from "@apollo/client";

export const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    firstName
    lastName
    gender
    heightCm
    weightKg
    location
  }
`;

export const LIST_USERS = gql`
  query ListUsers {
    users {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const SEARCH_USERS = gql`
  query SearchUsers($filter: UserSearchInput!) {
    searchUsers(filter: $filter) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;
```

A `fragment` is a reusable list of fields, so we write "id, firstName, …" once and reuse it with `...UserFields`. `$filter` and `$input` are *variables*, blanks filled in when the request is sent.

`src/graphql/options.ts` — the choices for the dropdown lists:
```ts
import type { Gender, Location } from "./types";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

export const LOCATION_OPTIONS: { value: Location; label: string }[] = [
  { value: "BANGALORE", label: "Bangalore" },
  { value: "CHENNAI", label: "Chennai" },
  { value: "SALEM", label: "Salem" },
  { value: "HYDERABAD", label: "Hyderabad" },
];

export const HEIGHT_CM_OPTIONS: number[] = Array.from(
  { length: 210 - 140 + 1 },
  (_, i) => 140 + i
);

export const WEIGHT_KG_OPTIONS: number[] = Array.from(
  { length: 150 - 40 + 1 },
  (_, i) => 40 + i
);
```

### 6.4 The three components

**The "Add User" form.** `src/components/UserForm.tsx`

```tsx
import { useMutation } from "@apollo/client/react";
import { useState, type FormEvent } from "react";
import { CREATE_USER, LIST_USERS } from "../graphql/operations";
import { GENDER_OPTIONS, HEIGHT_CM_OPTIONS, LOCATION_OPTIONS, WEIGHT_KG_OPTIONS } from "../graphql/options";
import type { CreateUserInput, Gender, Location } from "../graphql/types";

const emptyForm: CreateUserInput = {
  firstName: "",
  lastName: "",
  gender: "MALE",
  heightCm: 170,
  weightKg: 70,
  location: "BANGALORE",
};

export function UserForm() {
  const [form, setForm] = useState<CreateUserInput>(emptyForm);
  const [createUser, { loading, error }] = useMutation(CREATE_USER, {
    refetchQueries: [{ query: LIST_USERS }],
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      return;
    }
    await createUser({ variables: { input: form } });
    setForm(emptyForm);
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Add User</h2>

      <div className="field-grid">
        <label>
          First name
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
        </label>

        <label>
          Last name
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
        </label>

        <label>
          Gender
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
          >
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Height (cm)
          <select
            value={form.heightCm}
            onChange={(e) => setForm({ ...form, heightCm: Number(e.target.value) })}
          >
            {HEIGHT_CM_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h} cm
              </option>
            ))}
          </select>
        </label>

        <label>
          Weight (kg)
          <select
            value={form.weightKg}
            onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })}
          >
            {WEIGHT_KG_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w} kg
              </option>
            ))}
          </select>
        </label>

        <label>
          Location
          <select
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value as Location })}
          >
            {LOCATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save User"}
      </button>

      {error && <p className="error">Failed to save user: {error.message}</p>}
    </form>
  );
}
```

Key ideas:

- `useState` – the component's short-term memory: what is currently typed in each box.
- `useMutation(CREATE_USER)` – gives us a function, `createUser`, that sends the mutation, plus `loading` and `error` flags.
- `refetchQueries: [{ query: LIST_USERS }]` – after saving, automatically reload the list so the new person appears.

**The search form.** `src/components/UserSearch.tsx`

```tsx
import { useState, type FormEvent } from "react";
import { GENDER_OPTIONS, LOCATION_OPTIONS } from "../graphql/options";
import type { Gender, Location, UserSearchInput } from "../graphql/types";

interface Props {
  onSearch: (filter: UserSearchInput) => void;
  onClear: () => void;
}

const emptyFilter: UserSearchInput = {
  firstName: "",
  lastName: "",
  gender: undefined,
  location: undefined,
};

export function UserSearch({ onSearch, onClear }: Props) {
  const [filter, setFilter] = useState<UserSearchInput>(emptyFilter);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned: UserSearchInput = {
      firstName: filter.firstName?.trim() || undefined,
      lastName: filter.lastName?.trim() || undefined,
      gender: filter.gender || undefined,
      location: filter.location || undefined,
    };
    onSearch(cleaned);
  };

  const handleClear = () => {
    setFilter(emptyFilter);
    onClear();
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Search Users</h2>

      <div className="field-grid">
        <label>
          First name
          <input
            type="text"
            value={filter.firstName ?? ""}
            onChange={(e) => setFilter({ ...filter, firstName: e.target.value })}
            placeholder="Any"
          />
        </label>

        <label>
          Last name
          <input
            type="text"
            value={filter.lastName ?? ""}
            onChange={(e) => setFilter({ ...filter, lastName: e.target.value })}
            placeholder="Any"
          />
        </label>

        <label>
          Gender
          <select
            value={filter.gender ?? ""}
            onChange={(e) =>
              setFilter({ ...filter, gender: (e.target.value || undefined) as Gender | undefined })
            }
          >
            <option value="">Any</option>
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Location
          <select
            value={filter.location ?? ""}
            onChange={(e) =>
              setFilter({ ...filter, location: (e.target.value || undefined) as Location | undefined })
            }
          >
            <option value="">Any</option>
            {LOCATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="button-row">
        <button type="submit">Search</button>
        <button type="button" className="secondary" onClick={handleClear}>
          Clear
        </button>
      </div>
    </form>
  );
}
```

This form doesn't call the server itself. When you press Search it tells its parent (`App`) "here are the filters" through `onSearch`. Empty boxes become `undefined` so they are left out of the search.

**The results table.** `src/components/UserList.tsx`

```tsx
import { useQuery } from "@apollo/client/react";
import { LIST_USERS, SEARCH_USERS } from "../graphql/operations";
import type { User, UserSearchInput } from "../graphql/types";

interface Props {
  activeFilter: UserSearchInput | null;
}

export function UserList({ activeFilter }: Props) {
  const isSearching = activeFilter !== null;

  const listResult = useQuery<{ users: User[] }>(LIST_USERS, {
    skip: isSearching,
    fetchPolicy: "cache-and-network",
  });

  const searchResult = useQuery<{ searchUsers: User[] }>(SEARCH_USERS, {
    skip: !isSearching,
    variables: { filter: activeFilter ?? {} },
    fetchPolicy: "network-only",
  });

  const { loading, error } = isSearching ? searchResult : listResult;
  const users = isSearching ? searchResult.data?.searchUsers : listResult.data?.users;

  return (
    <div className="card">
      <h2>{isSearching ? "Search Results" : "All Users"}</h2>

      {loading && <p>Loading...</p>}
      {error && <p className="error">Failed to load users: {error.message}</p>}

      {!loading && !error && (!users || users.length === 0) && <p>No users found.</p>}

      {!loading && !error && users && users.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Gender</th>
              <th>Height (cm)</th>
              <th>Weight (kg)</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.firstName}</td>
                <td>{user.lastName}</td>
                <td>{user.gender}</td>
                <td>{user.heightCm}</td>
                <td>{user.weightKg}</td>
                <td>{user.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

`useQuery` fetches data when the component appears. If a search is active it runs the search query and skips the list query; otherwise the opposite. `skip` means "don't run this one right now". `fetchPolicy` controls whether to trust the memory (cache) or always ask the server.

### 6.5 Put it together

`src/App.tsx`
```tsx
import { useState } from "react";
import "./App.css";
import { UserForm } from "./components/UserForm";
import { UserSearch } from "./components/UserSearch";
import { UserList } from "./components/UserList";
import type { UserSearchInput } from "./graphql/types";

function App() {
  const [activeFilter, setActiveFilter] = useState<UserSearchInput | null>(null);

  return (
    <div className="app">
      <header>
        <h1>User Directory</h1>
        <p className="subtitle">Frontend → Apollo Router → Subgraph → Java Microservice</p>
      </header>

      <main>
        <UserForm />
        <UserSearch onSearch={setActiveFilter} onClear={() => setActiveFilter(null)} />
        <UserList activeFilter={activeFilter} />
      </main>
    </div>
  );
}

export default App;
```

`App` holds the "current search" in its memory and hands it to the list. No filter (`null`) means "show everyone".

### 6.6 Make it look nice

Replace `src/index.css`:

```css
:root {
  --text: #333;
  --text-h: #08060d;
  --bg: #f7f7f9;

  font: 16px/1.5 system-ui, "Segoe UI", Roboto, sans-serif;
  color-scheme: light dark;
  color: var(--text);
  background: var(--bg);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@media (prefers-color-scheme: dark) {
  :root {
    --text: #d1d5db;
    --text-h: #f3f4f6;
    --bg: #16171d;
  }

  .card {
    background: #1f2028 !important;
    border-color: #2e303a !important;
  }

  th,
  td {
    border-color: #2e303a !important;
  }

  input,
  select {
    background: #16171d;
    color: var(--text);
    border-color: #2e303a;
  }
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

h1,
h2 {
  color: var(--text-h);
  font-weight: 600;
}
```

Replace `src/App.css`:

```css
.app {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

header {
  margin-bottom: 2rem;
}

header h1 {
  margin: 0 0 0.25rem;
  font-size: 1.75rem;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 1.5rem;
  background: #fff;
}

.card h2 {
  margin-top: 0;
  font-size: 1.1rem;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #333;
}

input,
select {
  font-size: 0.95rem;
  padding: 0.5rem 0.6rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-weight: normal;
}

button {
  padding: 0.55rem 1.2rem;
  border-radius: 6px;
  border: none;
  background: #6366f1;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button.secondary {
  background: #e5e7eb;
  color: #111;
}

.button-row {
  display: flex;
  gap: 0.75rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th,
td {
  text-align: left;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid #eee;
}

th {
  color: #555;
  font-weight: 600;
}

.error {
  color: #dc2626;
  font-size: 0.85rem;
}
```

Styling is purely cosmetic; feel free to change colours.

### 6.7 Run it

```bash
npm run dev
```

Open <http://localhost:5173>. Add a user, watch it appear in the table, and try the search. 🎉

---

## 7. Start and stop everything with one command

Starting four programs in four terminals gets tiring. Create `start-all.sh` in the top folder:

```bash
#!/usr/bin/env bash
# Starts microservice (8080), subgraph (4001), router (4000), frontend (5173).
# Logs go to /tmp/*.log. Run ./stop-all.sh to tear everything down.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Java microservice on :8080 ..."
(cd "$ROOT/microservice" && nohup ./mvnw -q spring-boot:run > /tmp/microservice.log 2>&1 &)

echo "Waiting for microservice ..."
timeout 90 bash -c 'until curl -sf http://localhost:8080/api/users >/dev/null; do sleep 2; done'

echo "Starting users-subgraph on :4001 ..."
(cd "$ROOT/subgraphs/users-subgraph" && nohup ./mvnw -q spring-boot:run > /tmp/subgraph.log 2>&1 &)

echo "Waiting for subgraph ..."
timeout 90 bash -c 'until curl -sf -X POST http://localhost:4001/graphql -H "Content-Type: application/json" -d "{\"query\":\"{ __typename }\"}" >/dev/null; do sleep 2; done'

echo "Starting Apollo Router on :4000 (health on :8088) ..."
(cd "$ROOT/router" && nohup ./router --config router.yaml --supergraph supergraph.graphql --dev > /tmp/router.log 2>&1 &)

echo "Waiting for router ..."
timeout 60 bash -c 'until curl -sf http://localhost:8088/health >/dev/null; do sleep 1; done'

echo "Starting frontend on :5173 ..."
(cd "$ROOT/frontend" && nohup npm run dev > /tmp/frontend.log 2>&1 &)

echo "Waiting for frontend ..."
timeout 60 bash -c 'until curl -sf http://localhost:5173 >/dev/null; do sleep 1; done'

echo "All up: open http://localhost:5173"
```

The order matters: each service depends on the previous one, so the script waits for each to answer before starting the next. (`timeout` is not installed on macOS by default; run `brew install coreutils` or just use four terminals.)

And `stop-all.sh`, which shuts down whatever is listening on our four ports:

```bash
#!/usr/bin/env bash
# Stops everything started by start-all.sh, by killing the listeners on each port.
set -uo pipefail

for port in 8080 4001 4000 8088 5173; do
  pids=$(lsof -ti:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Killing listener(s) on :$port -> $pids"
    kill -9 $pids 2>/dev/null || true
  fi
done

echo "Done."
```

```bash
chmod +x start-all.sh stop-all.sh
./start-all.sh
```

---

## 8. What just happened when you clicked "Save User"?

Follow one click through the whole system:

1. **React** collects the form values and Apollo Client sends a `createUser` mutation to `http://localhost:4000/`.
2. **The Router** looks at the supergraph, sees that `createUser` belongs to the `users` subgraph, and forwards the request to `http://localhost:4001/graphql`.
3. **The Subgraph** matches the request to `createUser` in `UserGraphQLController`, then calls `POST http://localhost:8080/api/users` through `MicroserviceClient`.
4. **The Microservice** validates the input, saves a row in the H2 database, and returns the new user with its new `id`.
5. The answer flows back the same way. The subgraph converts it into GraphQL's shape, the router passes it on, and React refetches the list and redraws the table.

---

## 9. Troubleshooting

| Problem | What to do |
|---|---|
| `Cannot find native binding` when running `npm run dev` | Your Node.js is too old. Install Node 20.19+ (or 22+) and run `npm install` again. |
| Router says `Address already in use` | An old router is still running. Run `lsof -ti:4000,8088 \| xargs kill`. |
| Browser shows a CORS error | Check the `cors` block in `router.yaml` lists `http://localhost:5173`, then restart the router. |
| Router refuses to start with an odd `cors` config error | Router 2.x uses the `cors.policies[]` layout shown above. Older tutorials use a different layout. |
| `rover supergraph compose` fails to connect | The subgraph must be running on 4001 first. |
| New field in the schema doesn't show up in the page | Re-run `./compose.sh`, then restart the router. |
| Subgraph fails to start or returns connection errors | Make sure the microservice is running on 8080. |
| Data disappeared | The database lives in `microservice/data/`. If you delete that folder you start fresh. |

---

## 10. Ideas to explore next

- **Add a field**, e.g. `email`. Change the entity, DTOs, `schema.graphqls`, models and the React form. Re-compose the supergraph.
- **Add a second subgraph** (say `orders`) that also mentions `User @key(fields: "id")`. Add it to `supergraph-config.yaml` and see the router combine both. This is where federation really shines.
- **Add authentication**: the router can check tokens before requests reach your services.
- **Swap H2 for PostgreSQL** by changing the datasource in the microservice only. Nothing else needs to change. That is the benefit of layers.
- **Write tests**: Spring's generated projects include test setups you can extend.

---

## 11. Quick reference

| What | Where | Port |
|---|---|---|
| Frontend | `frontend/` | 5173 |
| Router (GraphQL entry point, Sandbox) | `router/` | 4000 |
| Router health check | `router/` | 8088 |
| Users subgraph (+ GraphiQL at `/graphiql`) | `subgraphs/users-subgraph/` | 4001 |
| Microservice (+ H2 console at `/h2-console`) | `microservice/` | 8080 |

Happy building!
