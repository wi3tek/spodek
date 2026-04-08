# Etap 1: Budowanie za pomocą oficjalnego obrazu Maven
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
# Używamy systemowego 'mvn' zamiast './mvnw'
RUN mvn clean package -DskipTests

# Etap 2: Uruchomienie aplikacji
FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
# Kopiujemy zbudowany plik .jar z poprzedniego etapu
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]