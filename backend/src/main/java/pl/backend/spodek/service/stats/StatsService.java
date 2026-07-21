package pl.backend.spodek.service.stats;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import pl.backend.spodek.dto.FunFact;
import pl.backend.spodek.dto.StatsDto;
import pl.backend.spodek.model.Match;
import pl.backend.spodek.model.Player;
import pl.backend.spodek.model.PlayerRatingHistory;
import pl.backend.spodek.model.Team;
import pl.backend.spodek.repository.MatchRepository;
import pl.backend.spodek.repository.PlayerRatingHistoryRepository;
import pl.backend.spodek.repository.PlayerRepository;
import pl.backend.spodek.repository.TeamRepository;
import pl.backend.spodek.service.stats.model.MatchTracker;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final MatchRepository matchRepository;
    private final PlayerRepository playerRepository;
    private final PlayerRatingHistoryRepository ratingHistoryRepository;
    private final TeamRepository teamRepository;
    private final FunFactFactory funFactFactory;

    @Cacheable(value = "stats", key = "#leagueId.concat('-').concat(#seasonId).concat('-').concat(#scope)")
    public StatsDto.Response generateFullStats(String leagueId, String seasonId, String scope) {
        Map<String, Player> playersMap = playerRepository.findAll().stream()
                .collect(Collectors.toMap(Player::getId, p -> p));
        Map<String, Team> teamsMap = teamRepository.findAll().stream()
                .collect(Collectors.toMap(Team::getId, t -> t));

        List<Match> leagueMatches = matchRepository.findByLeagueIdAndFinished(leagueId, true);
        List<PlayerRatingHistory> ratingHistory = ratingHistoryRepository.findByLeagueIdOrderByCreatedAtAsc(leagueId);
        List<Match> seasonMatches = matchRepository.findBySeasonIdAndFinished(seasonId, true);

        // Aktywni gracze ZAWSZE bazują na obecnym sezonie, aby nie pokazywać "duchów" w historii
        Set<String> activePlayerIds = seasonMatches.stream()
                .flatMap(m -> Stream.concat(
                        (m.getHomeSide() != null && m.getHomeSide().getPlayers() != null ? m.getHomeSide().getPlayers() : List.<Match.PlayerStats>of()).stream(),
                        (m.getAwaySide() != null && m.getAwaySide().getPlayers() != null ? m.getAwaySide().getPlayers() : List.<Match.PlayerStats>of()).stream()
                ))
                .map(Match.PlayerStats::getPlayerId)
                .collect(Collectors.toSet());

        // Logika wyboru meczów do statystyk na podstawie zakresu
        List<Match> targetMatches = "ALL_TIME".equalsIgnoreCase(scope) ? leagueMatches : seasonMatches;

        return buildScopeStats(targetMatches, playersMap, teamsMap, ratingHistory, activePlayerIds);
    }

    private StatsDto.Response buildScopeStats(List<Match> matches, Map<String, Player> playersMap,
                                              Map<String, Team> teamsMap, List<PlayerRatingHistory> ratingHistory,
                                              Set<String> activePlayerIds) {
        if (matches.isEmpty()) {
            return new StatsDto.Response(List.of(), List.of(), List.of(), List.of(), new StatsDto.Leaderboards(List.of(), List.of(), List.of(), List.of()));
        }

        Map<String, List<String>> formMap = new HashMap<>();
        Map<String, Integer> goalsMap = new HashMap<>();
        Map<String, Integer> assistsMap = new HashMap<>();
        Map<String, Integer> yellowCardsMap = new HashMap<>();
        Map<String, Integer> redCardsMap = new HashMap<>();

        Map<String, Map<String, MatchTracker>> clubPerformanceMap = new HashMap<>();
        Map<String, MatchTracker> playerTotalTracker = new HashMap<>();

        List<Match> sortedMatches = matches.stream().sorted(Comparator.comparing(Match::getCreatedAt).reversed()).toList();

        for (Match m : sortedMatches) {
            processMatchForFormAndStats(m, m.getHomeSide(), m.getAwaySide(), formMap, goalsMap, assistsMap, yellowCardsMap, redCardsMap, clubPerformanceMap, playerTotalTracker);
            processMatchForFormAndStats(m, m.getAwaySide(), m.getHomeSide(), formMap, goalsMap, assistsMap, yellowCardsMap, redCardsMap, clubPerformanceMap, playerTotalTracker);
        }

        // Formy & ELO (jak dotychczas, bez zmian w samej iteracji)
        List<StatsDto.PlayerForm> forms = // ... (ten fragment zostaje dokładnie jak miałeś)
                // PONIŻEJ TYLKO ŻEBY SIĘ KOMPILOWAŁO W PRZYKŁADZIE, zostaw to co miałeś w tej sekcji:
                playersMap.values().stream().filter(p -> activePlayerIds.contains(p.getId())).map(p -> {
                    List<String> rawForm = formMap.getOrDefault(p.getId(), List.of());
                    List<String> last5 = rawForm.stream().limit(5).collect(Collectors.toList()); Collections.reverse(last5);
                    List<PlayerRatingHistory> playerHistory = ratingHistory.stream().filter(rh -> rh.getPlayerId().equals(p.getId())).toList();
                    BigDecimal currentElo = playerHistory.isEmpty() ? BigDecimal.valueOf(1000) : playerHistory.get(playerHistory.size() - 1).getRatingAfter();
                    PlayerRatingHistory maxPoint = playerHistory.stream().max(Comparator.comparing(PlayerRatingHistory::getRatingAfter).thenComparing(PlayerRatingHistory::getCreatedAt, Comparator.reverseOrder())).orElse(null);
                    PlayerRatingHistory minPoint = playerHistory.stream().min(Comparator.comparing(PlayerRatingHistory::getRatingAfter).thenComparing(PlayerRatingHistory::getCreatedAt)).orElse(null);
                    return new StatsDto.PlayerForm(p.getId(), p.getAlias(), last5, currentElo, maxPoint != null ? maxPoint.getRatingAfter() : BigDecimal.valueOf(1000), maxPoint != null ? maxPoint.getCreatedAt() : null, minPoint != null ? minPoint.getRatingAfter() : BigDecimal.valueOf(1000), minPoint != null ? minPoint.getCreatedAt() : null);
                }).filter(f -> !f.lastMatches().isEmpty()).toList();

        List<StatsDto.EloChartLine> eloChart = playersMap.values().stream().filter(p -> activePlayerIds.contains(p.getId())).map(p -> new StatsDto.EloChartLine(p.getAlias(), ratingHistory.stream().filter(rh -> rh.getPlayerId().equals(p.getId())).map(rh -> new StatsDto.EloPoint(rh.getCreatedAt(), rh.getRatingAfter())).toList())).filter(l -> !l.history().isEmpty()).toList();

        Map<String, Map<String, MatchTracker>> playedWith = new HashMap<>();
        Map<String, Map<String, MatchTracker>> playedAgainst = new HashMap<>();

        for (Match m : matches) {
            extractRelations(m.getHomeSide(), m.getHomeSide(), m.getAwaySide(), playedWith, true);
            extractRelations(m.getAwaySide(), m.getAwaySide(), m.getHomeSide(), playedWith, true);
            extractRelations(m.getHomeSide(), m.getHomeSide(), m.getAwaySide(), playedAgainst, false);
            extractRelations(m.getAwaySide(), m.getAwaySide(), m.getHomeSide(), playedAgainst, false);
        }

        // Filtrujemy relacje i dodajemy ULUBIONE KLUBY
        List<StatsDto.PlayerRelations> relations = playersMap.keySet().stream()
                .filter(activePlayerIds::contains)
                .map(pId -> {
                    // Budujemy listę ulubionych klubów gracza
                    List<StatsDto.FavoriteTeam> favTeams = clubPerformanceMap.getOrDefault(pId, Map.of()).entrySet().stream()
                            .map(e -> {
                                Team t = teamsMap.get(e.getKey());
                                String tName = t != null ? (t.getAlias() != null ? t.getAlias() : t.getName()) : "Nieznana";
                                Integer aId = t != null ? t.getAssetId() : null;
                                MatchTracker tr = e.getValue();
                                // AKTUALIZACJA: tr.getGoalsAgainst() na samym końcu konstruktora
                                return new StatsDto.FavoriteTeam(tName, aId, tr.getMatches(), tr.getWins(), tr.getGoalsFor(), tr.getGoalsAgainst());
                            })
                            .filter(ft -> !ft.teamName().toLowerCase().contains("nieznan"))
                            .sorted(Comparator.comparingInt(StatsDto.FavoriteTeam::matches).reversed())
                            .toList();

                    return new StatsDto.PlayerRelations(
                            pId,
                            playersMap.get(pId).getAlias(),
                            convertTrackerToRelations(playedWith.getOrDefault(pId, Map.of()), playersMap, activePlayerIds),
                            convertTrackerToRelations(playedAgainst.getOrDefault(pId, Map.of()), playersMap, activePlayerIds),
                            favTeams
                    );
                })
                .filter(r -> !r.playedWith().isEmpty() || !r.playedAgainst().isEmpty() || !r.favoriteTeams().isEmpty())
                .sorted(Comparator.comparing(StatsDto.PlayerRelations::alias))
                .toList();

        FunFactInput input = FunFactInput.builder()
                .playedWith(playedWith)
                .playedAgainst(playedAgainst)
                .yellowCardsMap(yellowCardsMap)
                .redCardsMap(redCardsMap)
                .assistsMap(assistsMap)
                .goalsMap(goalsMap)
                .clubPerformanceMap(clubPerformanceMap)
                .playerTotalTracker(playerTotalTracker)
                .playersMap(playersMap)
                .teamsMap(teamsMap)
                .activePlayerIds(activePlayerIds)
                .targetMatches(matches)          // <--- DODANO
                .ratingHistory(ratingHistory)    // <--- DODANO
                .build();

        List<FunFact> funFacts = funFactFactory.generateFunFacts(input);

        StatsDto.Leaderboards leaderboards = new StatsDto.Leaderboards(buildLeaderboard(goalsMap, playersMap, activePlayerIds), buildLeaderboard(assistsMap, playersMap, activePlayerIds), buildLeaderboard(yellowCardsMap, playersMap, activePlayerIds), buildLeaderboard(redCardsMap, playersMap, activePlayerIds));

        return new StatsDto.Response(forms, eloChart, relations, funFacts, leaderboards);
    }

    private void processMatchForFormAndStats(Match m, Match.MatchSide side, Match.MatchSide oppSide,
                                             Map<String, List<String>> formMap, Map<String, Integer> goals,
                                             Map<String, Integer> assists, Map<String, Integer> yellowCards, Map<String, Integer> redCards,
                                             Map<String, Map<String, MatchTracker>> clubPerformanceMap,
                                             Map<String, MatchTracker> playerTotalTracker) {
        boolean isWin = side.getGoals() > oppSide.getGoals();
        boolean isDraw = side.getGoals() == oppSide.getGoals();
        String result = isWin ? "W" : (side.getGoals() == oppSide.getGoals() ? "D" : "L");
        String teamId = side.getTeamId() != null ? side.getTeamId() : "unknown"; // ZMIANA: używamy ID, a nie String name

        if (side.getPlayers() != null) {
            for (Match.PlayerStats ps : side.getPlayers()) {
                String pId = ps.getPlayerId();
                formMap.computeIfAbsent(pId, k -> new ArrayList<>()).add(result);
                goals.merge(pId, ps.getGoals(), Integer::sum); assists.merge(pId, ps.getAssists(), Integer::sum);
                yellowCards.merge(pId, ps.getYellowCards(), Integer::sum); redCards.merge(pId, ps.getRedCards(), Integer::sum);

                clubPerformanceMap.computeIfAbsent(pId, k -> new HashMap<>())
                        .computeIfAbsent(teamId, k -> new MatchTracker())
                        .addMatch(isWin, isDraw,side.getGoals(), oppSide.getGoals());

                playerTotalTracker.computeIfAbsent(pId, k -> new MatchTracker())
                        .addMatch(isWin, isDraw,side.getGoals(), oppSide.getGoals());
            }
        }
    }

    private void extractRelations(Match.MatchSide side, Match.MatchSide mySide, Match.MatchSide oppSide,
                                  Map<String, Map<String, MatchTracker>> relationsMap, boolean isPartner) {
        if (side == null || side.getPlayers() == null) return;
        boolean isWin = mySide.getGoals() > oppSide.getGoals();
        boolean isDraw = mySide.getGoals() == oppSide.getGoals(); // NOWE: wyliczenie remisu

        for (Match.PlayerStats ps : side.getPlayers()) {
            String pId = ps.getPlayerId();
            Map<String, MatchTracker> subMap = relationsMap.computeIfAbsent(pId, k -> new HashMap<>());

            if (isPartner) {
                for (Match.PlayerStats partnerPs : side.getPlayers()) {
                    String partnerId = partnerPs.getPlayerId();
                    if (pId.equals(partnerId)) continue;
                    subMap.computeIfAbsent(partnerId, k -> new MatchTracker())
                            .addMatch(isWin, isDraw, mySide.getGoals(), oppSide.getGoals()); // Zmiana: przekazujemy isDraw
                }
            } else {
                for (Match.PlayerStats oppPs : oppSide.getPlayers()) {
                    String oppId = oppPs.getPlayerId();
                    subMap.computeIfAbsent(oppId, k -> new MatchTracker())
                            .addMatch(isWin, isDraw, mySide.getGoals(), oppSide.getGoals()); // Zmiana: przekazujemy isDraw
                }
            }
        }
    }

    private List<StatsDto.Relation> convertTrackerToRelations(Map<String, MatchTracker> map, Map<String, Player> playersMap, Set<String> activePlayerIds) {
        return map.entrySet().stream()
                .filter(e -> activePlayerIds.contains(e.getKey()))
                .map(e -> {
                    String alias = playersMap.containsKey(e.getKey()) ? playersMap.get(e.getKey()).getAlias() : "Nieznany";
                    MatchTracker tr = e.getValue();
                    // Zmiana: przekazujemy tr.getDraws() oraz tr.getLosses()
                    return new StatsDto.Relation(
                            alias,
                            tr.getMatches(),
                            tr.getWins(),
                            tr.getDraws(),
                            tr.getLosses(),
                            tr.getGoalsFor(),
                            tr.getGoalsAgainst()
                    );
                })
                .sorted((a, b) -> Integer.compare(b.matches(), a.matches()))
                .toList();
    }

    private List<StatsDto.LeaderboardEntry> buildLeaderboard(Map<String, Integer> dataMap, Map<String, Player> playersMap, Set<String> activePlayerIds) {
        return dataMap.entrySet().stream()
                .filter(e -> activePlayerIds.contains(e.getKey()) && e.getValue() > 0) // Wywalamy tych, co mają 0 (nie ma sensu ich wyświetlać)
                .map(e -> new StatsDto.LeaderboardEntry(
                        playersMap.containsKey(e.getKey()) ? playersMap.get(e.getKey()).getAlias() : "Nieznany",
                        e.getValue()
                ))
                // Sortowanie malejąco, a w przypadku remisu - alfabetycznie po nicku
                .sorted(Comparator.comparingInt(StatsDto.LeaderboardEntry::value).reversed()
                        .thenComparing(StatsDto.LeaderboardEntry::alias))
                .toList();
    }
}