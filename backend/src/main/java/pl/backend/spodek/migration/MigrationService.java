package pl.backend.spodek.migration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pl.backend.spodek.migration.dto.LeagueMigrationDto;
import pl.backend.spodek.model.*;
import pl.backend.spodek.repository.*;
import pl.backend.spodek.service.MatchService;
import pl.backend.spodek.service.SeasonService;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MigrationService {

    private final LeagueRepository leagueRepository;
    private final SeasonRepository seasonRepository;
    private final MatchweekRepository matchweekRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final MatchService matchService;
    private final MongoTemplate mongoTemplate;
    private final SeasonService seasonService;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Transactional
    public void runMigration(MultipartFile matchesFile, MultipartFile teamsFile, LeagueMigrationDto leagueDto) {
        log.info("========================================================================");
        log.info("🚀 ROZPOCZYNAMY PROCES MIGRACJI RETRO LIGI");
        log.info("========================================================================");

        // NOWE: Czyścimy bazę przed nową próbą!
        cleanupPreviousFailedMigration();

        // 1. Zapisanie/Aktualizacja nowej ligi z twardymi datami (Bypass auditingu)
        log.info("[KROK 1/5] Inicjalizacja kontenera ligi: '{}'...", leagueDto.getName());
        League league = createLeague(leagueDto);
        log.info("✔️ Sukces: Liga '{}' zapisana w Mongo z ID: {}", league.getName(), league.getId());

        // 2. Parsowanie teams_migration.csv i synchronizacja słownika klubów
        log.info("[KROK 2/5] Parsowanie pliku teams_migration.csv...");
        Map<String, String> teamMap = processTeamsCsv(teamsFile);
        log.info("✔️ Sukces: Zaimportowano i zmapowano pomyślnie {} drużyn z pliku CSV.", teamMap.size());

        // 3. Parsowanie matches.csv do listy obiektów w pamięci
        log.info("[KROK 3/5] Parsowanie pliku matches.csv...");
        List<ParsedMatchRow> parsedMatches = parseMatchesCsv(matchesFile);
        log.info("✔️ Sukces: Odczytano poprawnie {} rekordów meczowych.", parsedMatches.size());

        // 4. Chronologiczne sortowanie meczów (KLUCZOWE dla prawidłowego obliczenia ELO!)
        log.info("[KROK 4/5] Sortowanie chronologiczne meczów według daty rozegrania...");
        parsedMatches.sort(Comparator.comparing(ParsedMatchRow::getMatchTime));
        log.info("✔️ Mecze zostały posortowane. Najstarszy mecz: {}, Najnowszy mecz: {}",
                parsedMatches.get(0).getMatchTime(), parsedMatches.get(parsedMatches.size() - 1).getMatchTime());

        // Struktury podręczne
        Map<String, Season> seasonsMap = new HashMap<>(); // NazwaSezonu -> Sezon
        Map<String, Map<Integer, Set<String>>> matchweekAttendanceMap = new HashMap<>(); // SeasonId -> (Matchweek -> Set<PlayerId>)

        log.info("[KROK 5/5] Rozpoczynamy chronologiczne procesowanie i rozliczanie meczów...");
        int successCount = 0;
        int errorCount = 0;

        for (int i = 0; i < parsedMatches.size(); i++) {
            ParsedMatchRow row = parsedMatches.get(i);
            String matchContext = String.format("[Mecz %d/%d (Stare ID: %s, Data: %s, Kolejka: %d)]",
                    (i + 1), parsedMatches.size(), row.getMatchId(), row.getMatchTime(), row.getMatchweek());

            try {
                // A. Sprawdzenie / Utworzenie Sezonu (Rozwiązany problem z computeIfAbsent)
                Season season = seasonsMap.get(row.getSeasonName());
                if (season == null) {
                    log.info("{} Wykryto nowy sezon: '{}'. Trwa weryfikacja/tworzenie w bazie...", matchContext, row.getSeasonName());
                    season = getOrCreateSeason(row.getSeasonName(), league.getId(), row);
                    seasonsMap.put(row.getSeasonName(), season);
                }

                // B. Sprawdzenie / Utworzenie / Pobranie graczy po aliasie
                log.debug("{} Pobieranie/Tworzenie zawodników gospodarzy ({}) i gości ({})...",
                        matchContext, row.getHomePlayerAliases(), row.getAwayPlayerAliases());
                List<String> homePlayerIds = getOrCreatePlayers(row.getHomePlayerAliases());
                List<String> awayPlayerIds = getOrCreatePlayers(row.getAwayPlayerAliases());

                // C. Rejestracja obecności w Matchweek (pamięć podręczna)
                registerAttendanceInCache(matchweekAttendanceMap, season.getId(), row.getMatchweek(), homePlayerIds, awayPlayerIds);

                // D. Budowanie meczu
                Match match = new Match();
                match.setSeasonId(season.getId());
                match.setLeagueId(league.getId());
                match.setMatchweek(row.getMatchweek());
                match.setFinished(true);

                match.setHomeSide(buildMatchSide(row.getHomeTeamOldId(), teamMap, row.getHomeGoals(), homePlayerIds));
                match.setAwaySide(buildMatchSide(row.getAwayTeamOldId(), teamMap, row.getAwayGoals(), awayPlayerIds));

                // E. Zapis meczu przez mechanizm ligowy (to uruchomi przeliczenie rankingu ELO!)
                Match savedMatch = matchService.createMatch(match);

                // F. BYPASS AUDITINGU - Wymuszenie historycznych dat w Mongo
                forceHistoricalDates(savedMatch.getId(), row.getMatchTime());

                successCount++;
                if (successCount % 50 == 0) {
                    log.info("⚡ Zmigrowano pomyślnie już {} meczów...", successCount);
                }

            } catch (Exception e) {
                errorCount++;
                log.error("❌ KRYTYCZNY BŁĄD podczas migracji meczu! {}", matchContext);
                log.error(" > Szczegóły błędu: {}", e.getMessage());
                log.error(" > Dane wejściowe wiersza: Sezon: '{}', Gospodarze ID: '{}' (gole: {}), Goście ID: '{}' (gole: {})",
                        row.getSeasonName(), row.getHomeTeamOldId(), row.getHomeGoals(), row.getAwayTeamOldId(), row.getAwayGoals());
                log.error(" > Gracze gospodarze: '{}', Gracze goście: '{}'", row.getHomePlayerAliases(), row.getAwayPlayerAliases());
                log.error("------------------------------------------------------------------------");
            }
        }

        // 5. Zapisanie skumulowanej obecności w Matchweekach do bazy MongoDB
        log.info("Zapisywanie skumulowanych list obecności w Matchweekach do bazy...");
        saveAllMatchweeksFromCache(matchweekAttendanceMap);

        log.info("========================================================================");
        log.info("🎉 PODSUMOWANIE MIGRACJI:");
        log.info(" > Sukcesy: {} meczów", successCount);
        log.info(" > Błędy/Pominięte: {} meczów", errorCount);
        log.info(" > Łącznie przetworzono: {} meczów", parsedMatches.size());
        log.info("========================================================================");
    }

    private League createLeague(LeagueMigrationDto dto) {
        League league = new League();
        league.setName(dto.getName());
        league.setLogoUrl(dto.getLogoUrl());
        league.setDescription(dto.getDescription());
        league.setType(dto.getType());
        league.setStatus("ACTIVE");
        leagueRepository.save(league);

        // Wymuszamy historyczne daty Ligi
        Query query = new Query(Criteria.where("_id").is(league.getId()));
        Update update = new Update()
                .set("createdAt", dto.getCreationDate())
                .set("updatedAt", dto.getLastModificationDate())
                .set("createdBy", "SYSTEM_MIGRATION")
                .set("updatedBy", "SYSTEM_MIGRATION");
        mongoTemplate.updateFirst(query, update, League.class);

        return league;
    }

    private Map<String, String> processTeamsCsv(MultipartFile file) {
        Map<String, String> teamMap = new HashMap<>();
        int lineCounter = 0;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean isHeader = true;
            while ((line = reader.readLine()) != null) {
                lineCounter++;
                if (isHeader) { isHeader = false; continue; }
                String[] parts = line.split(";", -1);
                if (parts.length < 2) {
                    log.warn("[Teams CSV] Pomijam niekompletną linię {}: '{}'", lineCounter, line);
                    continue;
                }

                String oldId = parts[0].trim();
                String name = parts[1].trim();
                String newAssetStr = parts.length > 2 ? parts[2].trim() : "";

                if (!newAssetStr.isEmpty()) {
                    // ZASADA 1A: Istnieje NEW_ASSET -> Aktualizujemy nazwę w Mongo
                    int assetId = (int) Double.parseDouble(newAssetStr);
                    Optional<Team> teamOpt = teamRepository.findByAssetId(assetId);
                    if (teamOpt.isPresent()) {
                        Team team = teamOpt.get();
                        team.setName(name);
                        teamRepository.save(team);
                        log.debug("[Klub] Zaktualizowano nazwę dla assetId {}: {}", assetId, name);
                    } else {
                        Team team = new Team();
                        team.setAssetId(assetId);
                        team.setName(name);
                        teamRepository.save(team);
                        log.info("[Klub] Utworzono brakujący klub z NEW_ASSET w Mongo: {} (assetId: {})", name, assetId);
                    }
                    teamMap.put(oldId, String.valueOf(assetId));
                } else {
                    // ZASADA 1B: Brak NEW_ASSET -> Tworzymy nową unikalną drużynę (assetId = 9999 + OLD_ID)
                    int highAssetId = Integer.parseInt("9999" + oldId);
                    Optional<Team> teamOpt = teamRepository.findByAssetId(highAssetId);
                    if (teamOpt.isEmpty()) {
                        Team team = new Team();
                        team.setAssetId(highAssetId);
                        team.setName(name);
                        teamRepository.save(team);
                        log.info("[Klub] Zgodnie z zasadą utworzono nową unikalną drużynę: {} (assetId: {})", name, highAssetId);
                    }
                    teamMap.put(oldId, String.valueOf(highAssetId));
                }
            }
        } catch (Exception e) {
            log.error("[Teams CSV] Błąd krytyczny parsowania linii {}: {}", lineCounter, e.getMessage());
            throw new RuntimeException(e);
        }
        return teamMap;
    }

    private List<ParsedMatchRow> parseMatchesCsv(MultipartFile file) {
        List<ParsedMatchRow> rows = new ArrayList<>();
        int lineCounter = 0;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean isHeader = true;
            while ((line = reader.readLine()) != null) {
                lineCounter++;
                if (isHeader) { isHeader = false; continue; }

                // ZMIANA 1: Używamy split(";", -1), aby Java nie ucinała pustych kolumn na końcu wiersza!
                String[] rawParts = line.split(";", -1);

                if (rawParts.length < 19) {
                    log.warn("[Matches CSV] Pomijam uszkodzoną linię {} (za mało kolumn: {}): '{}'", lineCounter, rawParts.length, line);
                    continue;
                }

                // Czyścimy wartości z cudzysłowów i białych znaków
                String[] p = new String[rawParts.length];
                for (int j = 0; j < rawParts.length; j++) {
                    p[j] = rawParts[j].replace("\"", "").trim();
                }

                try {
                    ParsedMatchRow row = new ParsedMatchRow();
                    row.setMatchId(p[0]);
                    row.setMatchTime(parseDateTimeSafe(p[1]));

                    // ZMIANA 2: Używamy bezpiecznego parsowania liczb
                    row.setMatchweek(parseIntSafe(p[2], 1));
                    row.setSeasonName(p[3]);
                    row.setSeasonFinished(parseIntSafe(p[4], 0) == 1);
                    row.setSeasonLeagueSeasonCount(parseIntSafe(p[5], 0));

                    row.setSeasonStartDate(parseDateTimeSafe(p[6]));
                    row.setSeasonEndDate(parseDateTimeSafe(p[7]));
                    row.setSeasonCreationDate(parseDateTimeSafe(p[8]));
                    row.setSeasonLastModificationDate(parseDateTimeSafe(p[9]));

                    row.setSeasonImage(p[10]);
                    row.setSeasonUniqueTeams(parseIntSafe(p[11], 0) == 1);
                    row.setSeasonMinPlayerMatchAmount(parseIntSafe(p[12], 0));

                    row.setHomeTeamOldId(p[13]);
                    row.setHomeGoals(parseIntSafe(p[14], 0));
                    row.setHomePlayerAliases(p[15]);

                    row.setAwayTeamOldId(p[16]);
                    row.setAwayGoals(parseIntSafe(p[17], 0));
                    row.setAwayPlayerAliases(p[18]);

                    rows.add(row);
                } catch (Exception e) {
                    log.error("[Matches CSV] Błąd formatowania danych w linii {}: {}", lineCounter, e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("[Matches CSV] Błąd odczytu pliku: {}", e.getMessage());
            throw new RuntimeException(e);
        }
        return rows;
    }

    private Season getOrCreateSeason(String name, String leagueId, ParsedMatchRow row) {
        return seasonRepository.findByLeagueId(leagueId).stream()
                .filter(s -> s.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseGet(() -> {
                    Season s = new Season();
                    s.setName(name);
                    s.setLeagueId(leagueId);
                    s.setStatus(row.isSeasonFinished() ? "FINISHED" : "ACTIVE");
                    s.setStartDate(row.getSeasonStartDate());
                    s.setEndDate(row.getSeasonEndDate());
                    s.setImage(row.getSeasonImage());
                    s.setUniqueTeams(row.isSeasonUniqueTeams());
                    s.setMinPlayerMatchAmount(row.getSeasonMinPlayerMatchAmount());
                    s.setLeagueSeasonCount(row.getSeasonLeagueSeasonCount());
                    s.setLiveCode( seasonService.generateUniqueLiveCode() );
                    seasonRepository.save(s);

                    // Wymuszenie historycznych dat Sezonu w MongoDB
                    Query query = new Query(Criteria.where("_id").is(s.getId()));
                    Update update = new Update()
                            .set("createdAt", row.getSeasonCreationDate())
                            .set("updatedAt", row.getSeasonLastModificationDate())
                            .set("createdBy", "SYSTEM_MIGRATION")
                            .set("updatedBy", "SYSTEM_MIGRATION");
                    mongoTemplate.updateFirst(query, update, Season.class);

                    log.info("[Sezon] Utworzono historyczny Sezon '{}' z datą utworzenia: {}", s.getName(), row.getSeasonCreationDate());
                    return s;
                });
    }

    private List<String> getOrCreatePlayers(String aliasesCommaSeparated) {
        List<String> playerIds = new ArrayList<>();
        String[] aliases = aliasesCommaSeparated.split(",");
        for (String alias : aliases) {
            String cleanedAlias = alias.trim();
            if (cleanedAlias.isEmpty()) continue;

            // Szukamy w bazie bez względu na wielkość liter
            Player player = playerRepository.findAll().stream()
                    .filter(p -> p.getAlias().equalsIgnoreCase(cleanedAlias))
                    .findFirst()
                    .orElseGet(() -> {
                        Player p = new Player();
                        p.setAlias(cleanedAlias);
                        p.setName(cleanedAlias);
                        playerRepository.save(p);

                        // Daty audytowe dla nowego gracza
                        Query query = new Query(Criteria.where("_id").is(p.getId()));
                        Update update = new Update()
                                .set("createdAt", LocalDateTime.now())
                                .set("updatedAt", LocalDateTime.now())
                                .set("createdBy", "SYSTEM_MIGRATION")
                                .set("updatedBy", "SYSTEM_MIGRATION");
                        mongoTemplate.updateFirst(query, update, Player.class);

                        log.info("[Szpiler] Założono nową kartotekę gracza: '{}' w Mongo", cleanedAlias);
                        return p;
                    });
            playerIds.add(player.getId());
        }
        return playerIds;
    }

    private Match.MatchSide buildMatchSide(String oldTeamId, Map<String, String> teamMap, int goals, List<String> playerIds) {
        Match.MatchSide ms = new Match.MatchSide();
        ms.setGoals(goals); //

        String assetIdStr = teamMap.get(oldTeamId);
        if (assetIdStr != null) {
            int assetId = Integer.parseInt(assetIdStr);
            teamRepository.findByAssetId(assetId).ifPresentOrElse(
                    team -> ms.setTeamId(team.getId()), //
                    () -> log.warn("[MatchSide] Błąd krytyczny! Zmapowano stare ID '{}' na assetId '{}', ale nie znaleziono takiego klubu w Mongo!", oldTeamId, assetId)
            );
        } else {
            // Zabezpieczenie dla legendarnej Nieznanej Drużyny (751)
            log.warn("[MatchSide] Brak mapowania w CSV dla starego ID drużyny: '{}'. Przypisuję domyślnie 'Nieznana Drużyna' (9999751)...", oldTeamId);
            teamRepository.findByAssetId(9999751).ifPresentOrElse(
                    t -> ms.setTeamId(t.getId()), //
                    () -> log.error("[MatchSide] Błąd krytyczny! Nie znaleziono nawet domyślnej Nieznanej Drużyny (9999751) w Mongo!")
            );
        }

        List<Match.PlayerStats> stats = new ArrayList<>();
        for (String pId : playerIds) {
            Match.PlayerStats ps = new Match.PlayerStats();
            ps.setPlayerId(pId); //
            ps.setGoals(0); //
            ps.setAssists(0); //
            ps.setYellowCards(0); //
            ps.setRedCards(0); //
            stats.add(ps); //
        }
        ms.setPlayers(stats); //
        return ms;
    }

    private void registerAttendanceInCache(Map<String, Map<Integer, Set<String>>> cache, String seasonId, int matchweek, List<String> p1, List<String> p2) {
        cache.computeIfAbsent(seasonId, k -> new HashMap<>())
                .computeIfAbsent(matchweek, k -> new HashSet<>())
                .addAll(p1);

        cache.get(seasonId).get(matchweek).addAll(p2);
    }

    private void saveAllMatchweeksFromCache(Map<String, Map<Integer, Set<String>>> cache) {
        cache.forEach((seasonId, matchweeks) ->
                matchweeks.forEach((weekNum, playerIds) -> {
                    Matchweek mw = matchweekRepository.findBySeasonIdAndMatchweek(seasonId, weekNum)
                            .orElseGet(() -> {
                                Matchweek newMw = new Matchweek();
                                newMw.setSeasonId(seasonId);
                                newMw.setMatchweek(weekNum);
                                newMw.setFinished(true);
                                return newMw;
                            });

                    // Unikamy duplikatów przy scalaniu obecności
                    for (String pid : playerIds) {
                        if (!mw.getPresentPlayerIds().contains(pid)) {
                            mw.getPresentPlayerIds().add(pid);
                        }
                    }
                    matchweekRepository.save(mw);

                    // Nadpisujemy daty Matchweeka
                    Query query = new Query(Criteria.where("_id").is(mw.getId()));
                    Update update = new Update()
                            .set("createdAt", LocalDateTime.now())
                            .set("updatedAt", LocalDateTime.now())
                            .set("createdBy", "SYSTEM_MIGRATION")
                            .set("updatedBy", "SYSTEM_MIGRATION");
                    mongoTemplate.updateFirst(query, update, Matchweek.class);
                    log.info("[Matchweek] Zapisano stan obecności dla Kolejki {} (Liczba graczy na kanapie: {})", weekNum, mw.getPresentPlayerIds().size());
                })
        );
    }

    private void forceHistoricalDates(String matchId, LocalDateTime historicalDate) {
        Query query = new Query(Criteria.where("_id").is(matchId));
        Update update = new Update()
                .set("createdAt", historicalDate)
                .set("updatedAt", historicalDate)
                .set("createdBy", "SYSTEM_MIGRATION")
                .set("updatedBy", "SYSTEM_MIGRATION");

        // Force-update meczu w Mongo
        mongoTemplate.updateFirst(query, update, Match.class);

        // Force-update powiązanej z nim historii rankingu ELO
        mongoTemplate.updateMulti(
                new Query(Criteria.where("matchId").is(matchId)),
                update,
                PlayerRatingHistory.class
        );
    }

    @lombok.Data
    private static class ParsedMatchRow {
        private String matchId;
        private LocalDateTime matchTime;
        private int matchweek;
        private String seasonName;
        private boolean seasonFinished;
        private int seasonLeagueSeasonCount;
        private LocalDateTime seasonStartDate;
        private LocalDateTime seasonEndDate;
        private LocalDateTime seasonCreationDate;
        private LocalDateTime seasonLastModificationDate;
        private String seasonImage;
        private boolean seasonUniqueTeams;
        private int seasonMinPlayerMatchAmount;
        private String homeTeamOldId;
        private int homeGoals;
        private String homePlayerAliases;
        private String awayTeamOldId;
        private int awayGoals;
        private String awayPlayerAliases;
    }

    private void cleanupPreviousFailedMigration() {

        Query migrationQuery = new Query(Criteria.where("createdBy").is("SYSTEM_MIGRATION"));

        long matchesDeleted = mongoTemplate.remove(migrationQuery, Match.class).getDeletedCount();
        long matchweeksDeleted = mongoTemplate.remove(migrationQuery, Matchweek.class).getDeletedCount();
        long seasonsDeleted = mongoTemplate.remove(migrationQuery, Season.class).getDeletedCount();
        long leaguesDeleted = mongoTemplate.remove(migrationQuery, League.class).getDeletedCount();
        long historyDeleted = mongoTemplate.remove(migrationQuery, PlayerRatingHistory.class).getDeletedCount();
        long playersDeleted = mongoTemplate.remove(migrationQuery, Player.class).getDeletedCount();

        log.info("✔️ Usunięto osierocone dane: Mecze ({}), Kanapy ({}), Sezony ({}), Ligi ({}), Historia ELO ({}), Gracze ({})",
                matchesDeleted, matchweeksDeleted, seasonsDeleted, leaguesDeleted, historyDeleted, playersDeleted);
    }

    private int parseIntSafe(String value, int defaultValue) {
        if (value == null || value.trim().isEmpty() || value.trim().equalsIgnoreCase("NULL")) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private LocalDateTime parseDateTimeSafe(String value) {
        if (value == null || value.trim().isEmpty() || value.trim().equalsIgnoreCase("NULL")) {
            return null;
        }
        return LocalDateTime.parse(value, DATE_FORMATTER);
    }
}