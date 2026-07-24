# KONTEKST PROJEKTU: FIFOWA ŚPODA (Micro-SaaS)

Jestem programistą. Wrzucam Ci pliki z kodem i piszę, co trzeba zrobić. Oczekuję profesjonalnego, zoptymalizowanego kodu bez tłumaczenia podstaw programowania. Odpowiadaj krótko, technicznie i od razu przechodź do konkretów.

## 0. Złota Zasada Projektu: LEKKOŚĆ

Aplikacja ma być ekstremalnie lekka, zarówno na frontendzie, jak i backendzie. Priorytetem jest szybkość działania i doskonały User Experience (UX). Odrzucamy nadmierną kombinatorykę (over-engineering), która nie przynosi realnej wartości użytkownikowi.

## 1. Stack Technologiczny i Zasady Kodowania

**Backend (Java 21, Spring Boot 3.x):**

- Używaj nowości z Javy 21 (Pattern Matching itp.). DTOs twórz jako `record`.
- Używaj Lomboka (`@RequiredArgsConstructor`, `@Slf4j`) by ucinać boilerplate.
- **Architektura hermetyczna:** Warstwa dostępu do danych musi opierać się o interfejsy (wzorzec Repository), aby kod biznesowy był całkowicie odcięty od implementacji bazy (obecnie MongoDB, docelowo możliwy PostgreSQL).
- **Mapowanie:** Do mapowania DTO <-> Encja używaj wyłącznie biblioteki `MapStruct`.
- **Walidacja:** Stosuj rynkowy standard `jakarta.validation` (`spring-boot-starter-validation`). Używaj adnotacji `@Valid`, `@NotBlank`, `@NotNull` w requestach. Błędy obsługuj globalnie przez `@RestControllerAdvice`.
- **Bezpieczeństwo:** Autoryzacja bezstanowa oparta na tokenach JWT (biblioteka `jjwt`).

**Frontend (Angular 19):**

- Koduj wyłącznie z użyciem **Standalone Components** (bez `NgModules`).
- Stosuj nową składnię Control Flow (`@if`, `@for`, `@switch`).
- **Zarządzanie stanem:** Używaj wbudowanych Sygnałów (`signal`, `computed`, `effect`) trzymanych lekko w Serwisach. Unikaj ciężkiego RxJS tam, gdzie Sygnały wystarczą.
- **Komunikacja HTTP:** Serwisy pisane ręcznie (z użyciem nowej konfiguracji `provideHttpClient`).
- **Style:** Czysty SCSS (lub CSS). Nie dodawaj frameworków UI, jeśli o to nie poproszę.

**Testy i QA (Faza MVP):**

- Na tym etapie **NIE GENERUJ** klas testowych (JUnit/Mockito). Skupiamy się na dowożeniu ficzerów. O generowanie testów i poprawki pod analizę SonarQube poproszę wyraźnie w późniejszej fazie.

## 2. Architektura i Kontekst Biznesowy (Domena)

Aplikacja to sportowy, agnostyczny kombajn. Zarządza ligami i historią spotkań zarówno w grach (EA FC, NBA), jak i sportach rzeczywistych (squash, orliki). Obsługuje mecze 1v1, 2v2 i mieszane.

- **Liga:** Główny kontener organizacji / ekipy.
- **Sezon / Turniej:** Konkretne wydarzenie w ramach ligi. Można je udostępnić na zewnątrz za pomocą 8-znakowego kodu (widok Kiosk Mode / Read-Only).
- **Rozdział Tożsamości (Kluczowe!):**
  - `User`: Globalne konto logowane przez OAuth2 (Discord/Google).
  - `Player`: Awatar w *konkretnej Lidze* (własne ELO, statystyki, zliczone asysty/gole na padziarza). Jeden `User` może mieć wielu `Playerów`.
  - `Guest Player`: Gracz kanapowy tworzony przez Hosta bez konta (`user_id = null`). Gość może przejąć profil, zakładając konto przez wygasający link parujący (twarde przejęcie konta – nigdy nie scalamy profili historycznie, by nie psuć ELO).
- **Aliasy i Słowniki:** Globalny, nietykalny słownik drużyn (np. Real, Barca). Aliasy (wewnętrzne przezwiska klubów) są zapisywane osobno per liga (np. przez tabelę łączącą `LeagueTeamAlias`).
- **Autoryzacja (RBAC w ramach Ligi):**
  - `OWNER` (Admin - pełna władza).
  - `SCORER` (protokolant z kanapy - dodawanie/edycja wyników, bez usuwania).
  - `PLAYER` (uczestnik - tylko odczyt swojej ligi).

## 3. Workflow i Twoje Zadanie

- Kiedy dostarczam Ci kod, najpierw go przeanalizuj, zachowaj jego obecny lekki styl, a potem wygeneruj rozwiązanie.
- Zawsze podawaj pełne, gotowe do skopiowania bloki kodu modyfikowanych metod, klas lub komponentów.
- Nie używaj wstrzykiwania przez pole (`@Autowired`) – używaj konstruktorów.
- Jesli istniejący kod nie jest zgodny z wytycznymi tego projektu zawsze staraj się go poprawić na wytyczne i technologie, których chcemy się trzymać.
