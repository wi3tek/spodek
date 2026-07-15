package pl.backend.spodek.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.backend.spodek.dto.StatsDto;
import pl.backend.spodek.model.Match;
import pl.backend.spodek.model.Player;
import pl.backend.spodek.model.PlayerRatingHistory;
import pl.backend.spodek.model.Team;
import pl.backend.spodek.repository.MatchRepository;
import pl.backend.spodek.repository.PlayerRatingHistoryRepository;
import pl.backend.spodek.repository.PlayerRepository;
import pl.backend.spodek.repository.TeamRepository;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final MatchRepository matchRepository;
    private final PlayerRepository playerRepository;
    private final PlayerRatingHistoryRepository ratingHistoryRepository;
    private final TeamRepository teamRepository;

    public StatsDto.Response generateFullStats(String leagueId) {
        Map<String, Player> playersMap = playerRepository.findAll().stream()
                .collect(Collectors.toMap(Player::getId, p -> p));
        Map<String, String> teamsMap = teamRepository.findAll().stream()
                .collect(Collectors.toMap(Team::getId, t -> t.getAlias() != null ? t.getAlias() : t.getName()));

        // Pobieramy TYLKO mecze ligowe
        List<Match> leagueMatches = matchRepository.findByLeagueIdAndFinished(leagueId, true);
        List<PlayerRatingHistory> ratingHistory = ratingHistoryRepository.findByLeagueIdOrderByCreatedAtAsc(leagueId);

        // Wywołujemy naszą prywatną metodę (zwraca teraz StatsDto.Response)
        return buildScopeStats(leagueMatches, playersMap, teamsMap, ratingHistory);
    }

    private StatsDto.Response buildScopeStats(List<Match> matches, Map<String, Player> playersMap,
                                              Map<String, String> teamsMap, List<PlayerRatingHistory> ratingHistory) {
        if (matches.isEmpty()) {
            return new StatsDto.Response(List.of(), List.of(), List.of(), List.of());
        }

        Map<String, List<String>> formMap = new HashMap<>();
        Map<String, Integer> goalsMap = new HashMap<>();
        Map<String, Integer> assistsMap = new HashMap<>();
        Map<String, Integer> cardsMap = new HashMap<>();

        // Dodatkowe mapy do ciekawostek
        Map<String, Map<String, MatchTracker>> clubPerformanceMap = new HashMap<>();
        Map<String, MatchTracker> playerTotalTracker = new HashMap<>();

        List<Match> sortedMatches = matches.stream()
                .sorted(Comparator.comparing(Match::getCreatedAt).reversed())
                .toList();

        for (Match m : sortedMatches) {
            // Przekazujemy teamsMap do processMatchForFormAndStats
            processMatchForFormAndStats(m, m.getHomeSide(), m.getAwaySide(), formMap, goalsMap, assistsMap, cardsMap, clubPerformanceMap, playerTotalTracker, teamsMap);
            processMatchForFormAndStats(m, m.getAwaySide(), m.getHomeSide(), formMap, goalsMap, assistsMap, cardsMap, clubPerformanceMap, playerTotalTracker, teamsMap);
        }

        List<StatsDto.PlayerForm> forms = playersMap.values().stream()
                .map(p -> {
                    List<String> rawForm = formMap.getOrDefault(p.getId(), List.of());
                    List<String> last5 = rawForm.stream().limit(5).collect(Collectors.toList());
                    Collections.reverse(last5);

                    BigDecimal currentElo = ratingHistory.stream()
                            .filter(rh -> rh.getPlayerId().equals(p.getId()))
                            .reduce((first, second) -> second)
                            .map(PlayerRatingHistory::getRatingAfter)
                            .orElse(BigDecimal.valueOf(1000));

                    return new StatsDto.PlayerForm(p.getId(), p.getAlias(), last5, currentElo);
                })
                .filter(f -> !f.lastMatches().isEmpty())
                .toList();

        List<StatsDto.EloChartLine> eloChart = playersMap.values().stream()
                .map(p -> {
                    List<StatsDto.EloPoint> points = ratingHistory.stream()
                            .filter(rh -> rh.getPlayerId().equals(p.getId()))
                            .map(rh -> new StatsDto.EloPoint(rh.getCreatedAt(), rh.getRatingAfter()))
                            .toList();
                    return new StatsDto.EloChartLine(p.getAlias(), points);
                })
                .filter(l -> !l.history().isEmpty())
                .toList();

        Map<String, Map<String, MatchTracker>> playedWith = new HashMap<>();
        Map<String, Map<String, MatchTracker>> playedAgainst = new HashMap<>();

        for (Match m : matches) {
            extractRelations(m.getHomeSide(), m.getHomeSide(), m.getAwaySide(), playedWith, true);
            extractRelations(m.getAwaySide(), m.getAwaySide(), m.getHomeSide(), playedWith, true);

            extractRelations(m.getHomeSide(), m.getAwaySide(), m.getAwaySide(), playedAgainst, false);
            extractRelations(m.getAwaySide(), m.getHomeSide(), m.getHomeSide(), playedAgainst, false);
        }

        List<StatsDto.PlayerRelations> relations = playersMap.keySet().stream()
                .map(pId -> new StatsDto.PlayerRelations(
                        pId,
                        playersMap.get(pId).getAlias(),
                        convertTrackerToRelations(playedWith.getOrDefault(pId, Map.of()), playersMap),
                        convertTrackerToRelations(playedAgainst.getOrDefault(pId, Map.of()), playersMap)
                ))
                .filter(r -> !r.playedWith().isEmpty() || !r.playedAgainst().isEmpty())
                .sorted(Comparator.comparing(StatsDto.PlayerRelations::alias))
                .toList();

        List<StatsDto.FunFact> funFacts = generateFunFacts(playedWith, playedAgainst, cardsMap, assistsMap, clubPerformanceMap, playerTotalTracker, playersMap);

        return new StatsDto.Response(forms, eloChart, relations, funFacts);
    }

    private void processMatchForFormAndStats(Match m, Match.MatchSide side, Match.MatchSide oppSide,
                                             Map<String, List<String>> formMap, Map<String, Integer> goals,
                                             Map<String, Integer> assists, Map<String, Integer> cards,
                                             Map<String, Map<String, MatchTracker>> clubPerformanceMap,
                                             Map<String, MatchTracker> playerTotalTracker,
                                             Map<String, String> teamsMap) {

        boolean isWin = side.getGoals() > oppSide.getGoals();
        String result = isWin ? "W" : (side.getGoals() == oppSide.getGoals() ? "D" : "L");
        String teamName = "Nieznany Klub";
        if (side.getTeamId() != null) {
            teamName = teamsMap.getOrDefault(side.getTeamId(), "Nieznany Klub");
        }

        if (side.getPlayers() != null) {
            for (Match.PlayerStats ps : side.getPlayers()) {
                String pId = ps.getPlayerId();
                formMap.computeIfAbsent(pId, k -> new ArrayList<>()).add(result);
                goals.merge(pId, ps.getGoals(), Integer::sum);
                assists.merge(pId, ps.getAssists(), Integer::sum);
                cards.merge(pId, ps.getYellowCards() + ps.getRedCards(), Integer::sum);

                clubPerformanceMap.computeIfAbsent(pId, k -> new HashMap<>())
                        .computeIfAbsent(teamName, k -> new MatchTracker())
                        .addMatch(isWin, side.getGoals(), oppSide.getGoals());

                playerTotalTracker.computeIfAbsent(pId, k -> new MatchTracker())
                        .addMatch(isWin, side.getGoals(), oppSide.getGoals());
            }
        }
    }

    private void extractRelations(Match.MatchSide sourceSide, Match.MatchSide targetSide, Match.MatchSide opponentSide,
                                  Map<String, Map<String, MatchTracker>> relationMap, boolean isPartner) {
        if (sourceSide.getPlayers() == null || targetSide.getPlayers() == null) return;
        boolean isWin = sourceSide.getGoals() > opponentSide.getGoals();

        for (Match.PlayerStats p1 : sourceSide.getPlayers()) {
            for (Match.PlayerStats p2 : targetSide.getPlayers()) {
                if (isPartner && p1.getPlayerId().equals(p2.getPlayerId())) continue;

                relationMap.computeIfAbsent(p1.getPlayerId(), k -> new HashMap<>())
                        .computeIfAbsent(p2.getPlayerId(), k -> new MatchTracker())
                        .addMatch(isWin, sourceSide.getGoals(), opponentSide.getGoals());
            }
        }
    }

    private List<StatsDto.Relation> convertTrackerToRelations(Map<String, MatchTracker> map, Map<String, Player> playersMap) {
        return map.entrySet().stream()
                .map(e -> {
                    String alias = playersMap.containsKey(e.getKey()) ? playersMap.get(e.getKey()).getAlias() : "Nieznany";
                    MatchTracker tr = e.getValue();
                    return new StatsDto.Relation(alias, tr.matches, tr.wins, tr.goalsFor, tr.goalsAgainst);
                })
                .sorted((a, b) -> Integer.compare(b.matches(), a.matches()))
                .toList();
    }

    private List<StatsDto.FunFact> generateFunFacts(
            Map<String, Map<String, MatchTracker>> playedWith,
            Map<String, Map<String, MatchTracker>> playedAgainst,
            Map<String, Integer> cardsMap,
            Map<String, Integer> assistsMap,
            Map<String, Map<String, MatchTracker>> clubPerformanceMap,
            Map<String, MatchTracker> playerTotalTracker,
            Map<String, Player> playersMap) {

        List<StatsDto.FunFact> facts = new ArrayList<>();

        // 1. Złoty Duet
        findBestRelation(playedWith, 3, true).ifPresent(r ->
                facts.add(new StatsDto.FunFact("Złoty Duet",
                        playersMap.get(r.p1).getAlias() + " & " + playersMap.get(r.p2).getAlias() +
                                " wygrywają " + Math.round(r.ratio * 100) + "% wspólnych meczów.", "🤝"))
        );

        // 2. Koszmar (Nemesis) - Gracz A ma najgorsze staty grając przeciwko B
        findBestRelation(playedAgainst, 3, false).ifPresent(r ->
                facts.add(new StatsDto.FunFact("Koszmar z boiska",
                        playersMap.get(r.p2).getAlias() + " to nemesis dla " + playersMap.get(r.p1).getAlias() +
                                " (wygrywa " + Math.round((1.0 - r.ratio) * 100) + "% starć).", "🔪"))
        );

        // 3. Darmowy Win - Gracz A ma najlepsze staty grając przeciwko B
        findBestRelation(playedAgainst, 3, true).ifPresent(r ->
                facts.add(new StatsDto.FunFact("Darmowy Win",
                        playersMap.get(r.p1).getAlias() + " ma " + playersMap.get(r.p2).getAlias() +
                                " w kieszeni (wygrywa " + Math.round(r.ratio * 100) + "% starć).", "🎯"))
        );

        // 4. Ulubiony Klub
        double bestClubWr = -1.0;
        String loyalPlayer = null;
        String loyalClub = null;
        for (var entry : clubPerformanceMap.entrySet()) {
            for (var clubEntry : entry.getValue().entrySet()) {
                if (clubEntry.getValue().matches >= 4) { // min 4 mecze klubem
                    double wr = (double) clubEntry.getValue().wins / clubEntry.getValue().matches;
                    if (wr > bestClubWr) {
                        bestClubWr = wr; loyalPlayer = entry.getKey(); loyalClub = clubEntry.getKey();
                    }
                }
            }
        }
        if (bestClubWr >= 0 && playersMap.containsKey(loyalPlayer)) {
            facts.add(new StatsDto.FunFact("Lojalność Klubowa",
                    playersMap.get(loyalPlayer).getAlias() + " niszczy system grając jako " + loyalClub +
                            " (" + Math.round(bestClubWr * 100) + "% wygranych).", "🛡️"));
        }

        // 5. Murarz (Najmniej straconych bramek na mecz)
        double bestDef = 999.0;
        String brickWall = null;
        for (var entry : playerTotalTracker.entrySet()) {
            if (entry.getValue().matches >= 5) {
                double avgLost = (double) entry.getValue().goalsAgainst / entry.getValue().matches;
                if (avgLost < bestDef) { bestDef = avgLost; brickWall = entry.getKey(); }
            }
        }
        if (brickWall != null && playersMap.containsKey(brickWall)) {
            facts.add(new StatsDto.FunFact("Murarz",
                    "Gdy " + playersMap.get(brickWall).getAlias() + " jest na boisku, drużyna traci średnio tylko " +
                            String.format("%.1f", bestDef) + " goli/mecz.", "🧱"));
        }

        // 6. Talizman (Najlepszy bilans bramkowy na mecz)
        double bestDiff = -999.0;
        String talisman = null;
        for (var entry : playerTotalTracker.entrySet()) {
            if (entry.getValue().matches >= 5) {
                double avgDiff = (double) (entry.getValue().goalsFor - entry.getValue().goalsAgainst) / entry.getValue().matches;
                if (avgDiff > bestDiff) { bestDiff = avgDiff; talisman = entry.getKey(); }
            }
        }
        if (talisman != null && playersMap.containsKey(talisman)) {
            facts.add(new StatsDto.FunFact("Talizman",
                    playersMap.get(talisman).getAlias() + " gwarantuje drużynie średni bilans " +
                            (bestDiff > 0 ? "+" : "") + String.format("%.1f", bestDiff) + " goli na mecz.", "🍀"));
        }

        // 7. Rzeźnik
        cardsMap.entrySet().stream().max(Map.Entry.comparingByValue()).ifPresent(e -> {
            if (e.getValue() > 0 && playersMap.containsKey(e.getKey())) {
                facts.add(new StatsDto.FunFact("Rzeźnik",
                        playersMap.get(e.getKey()).getAlias() + " ma już " + e.getValue() + " kartek na koncie.", "🟨"));
            }
        });

        // 8. Złota Piłka
        assistsMap.entrySet().stream().max(Map.Entry.comparingByValue()).ifPresent(e -> {
            if (e.getValue() > 0 && playersMap.containsKey(e.getKey())) {
                facts.add(new StatsDto.FunFact("Złota Piłka",
                        playersMap.get(e.getKey()).getAlias() + " rozdał najwięcej asyst (" + e.getValue() + ").", "👑"));
            }
        });

        return facts;
    }

    // Klasa pomocnicza dla relacji (Złoty Duet, Nemesis)
    private record RelationResult(String p1, String p2, double ratio) {}

    private Optional<RelationResult> findBestRelation(Map<String, Map<String, MatchTracker>> relationsMap, int minMatches, boolean findMax) {
        double bestWr = findMax ? -1.0 : 1.1;
        String p1 = null, p2 = null;

        for (var p1Entry : relationsMap.entrySet()) {
            for (var p2Entry : p1Entry.getValue().entrySet()) {
                MatchTracker tr = p2Entry.getValue();
                if (tr.matches >= minMatches) {
                    double wr = (double) tr.wins / tr.matches;
                    if ((findMax && wr > bestWr) || (!findMax && wr < bestWr)) {
                        bestWr = wr; p1 = p1Entry.getKey(); p2 = p2Entry.getKey();
                    }
                }
            }
        }
        return (p1 != null) ? Optional.of(new RelationResult(p1, p2, bestWr)) : Optional.empty();
    }

    private static class MatchTracker {
        int matches = 0;
        int wins = 0;
        int goalsFor = 0;
        int goalsAgainst = 0;

        void addMatch(boolean isWin, int gf, int ga) {
            this.matches++;
            if (isWin) this.wins++;
            this.goalsFor += gf;
            this.goalsAgainst += ga;
        }
    }
}