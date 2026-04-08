# Etap 1: Budowanie za pomocą oficjalnego obrazu Maven (wersja pełna, bez alpine)
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Etap 2: Uruchomienie aplikacji (używamy stabilnego obrazu JRE opartego na Ubuntu/Debian)
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]