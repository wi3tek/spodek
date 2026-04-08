# Etap 1: Budowanie aplikacji za pomocą Maven Wrapper
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src src
# Nadajemy uprawnienia do wykonania dla wrappera i budujemy plik .jar
RUN chmod +x ./mvnw
RUN ./mvnw clean package -DskipTests

# Etap 2: Uruchomienie aplikacji
FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
# Kopiujemy zbudowany plik .jar z poprzedniego etapu
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]