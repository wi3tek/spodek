package pl.backend.spodek.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.backend.spodek.dto.StatsDto;
import pl.backend.spodek.model.Match;
import pl.backend.spodek.repository.MatchRepository;
import pl.backend.spodek.repository.PlayerRepository;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatsService2 {

    private final MatchRepository matchRepository;
    private final PlayerRepository playerRepository;

    public StatsDto.Response getStats(String leagueId, String seasonId) {
        // Pobieramy całą historię ligi do obliczeń
        List<Match> matches = matchRepository.findByLeagueIdAndFinished(leagueId, true);

        if (matches.isEmpty()) {
            return new StatsDto.Response(List.of(), List.of(), List.of(), List.of());
        }

        // 1. Zbiór aktywnych graczy (tylko ci, którzy wystąpili w przekazanym seasonId)
        Set<String> activePlayerIds = new HashSet<>();
        for (Match match : matches) {
            if (match.getSeasonId().equals(seasonId)) {
                match.getHomeSide().getPlayers().forEach(p -> activeIdsAddSafe(activePlayerIds, p.getPlayerId()));
                match.getAwaySide().getPlayers().forEach(p -> activeIdsAddSafe(activePlayerIds, p.getPlayerId()));
            }
        }

        Map<String, StatsDto.PlayerForm> playerFormsMap = new HashMap<>();
        Map<String, StatsDto.EloChartLine> eloChartMap = new HashMap<>();
        Map<String, Map<String, StatsDto.Relation>> relationsWithMap = new HashMap<>();
        Map<String, Map<String, StatsDto.Relation>> relationsAgainstMap = new HashMap<>();

        // 2. Przetwarzamy CAŁĄ historię ligi, ale zapisujemy dane tylko dla aktywnych graczy
        for (Match match : matches) {
            processMatchForEloAndForm(match, playerFormsMap, eloChartMap, activePlayerIds);
            processMatchForRelations(match, relationsWithMap, relationsAgainstMap, activePlayerIds);
        }

        // 3. Budujemy finalne listy
        List<StatsDto.PlayerForm> forms = playerFormsMap.values().stream()
                .filter(f -> activePlayerIds.contains(f.playerId()))
                .sorted(Comparator.comparing(StatsDto.PlayerForm::currentElo).reversed())
                .collect(Collectors.toList());

        List<StatsDto.EloChartLine> eloChart = eloChartMap.values().stream()
                .filter(chart -> playerFormsMap.containsKey(chart.alias()))
                .collect(Collectors.toList());

        List<StatsDto.PlayerRelations> relations = buildRelationsList(relationsWithMap, relationsAgainstMap, activePlayerIds);

        // FunFacts wyliczamy na podstawie już przefiltrowanej bazy
        List<StatsDto.FunFact> funFacts = calculateFunFacts(matches, forms);

        return new StatsDto.Response(forms, eloChart, relations, funFacts);
    }

    private void activeIdsAddSafe(Set<String> set, String playerId) {
        if (playerId != null && !playerId.trim().isEmpty()) {
            set.add(playerId);
        }
    }

    private void processMatchForEloAndForm(Match match,
                                           Map<String, StatsDto.PlayerForm> formsMap,
                                           Map<String, StatsDto.EloChartLine> eloChartMap,
                                           Set<String> activePlayerIds) {
        processSideEloAndForm(match, match.getHomeSide(), match.getAwaySide(), formsMap, eloChartMap, activePlayerIds);
        processSideEloAndForm(match, match.getAwaySide(), match.getHomeSide(), formsMap, eloChartMap, activePlayerIds);
    }

    private void processSideEloAndForm(Match match,
                                       Match.MatchSide side,
                                       Match.MatchSide opponent,
                                       Map<String, StatsDto.PlayerForm> formsMap,
                                       Map<String, StatsDto.EloChartLine> eloChartMap,
                                       Set<String> activePlayerIds) {
        boolean isWin = side.getGoals() > opponent.getGoals();
        boolean isDraw = side.getGoals() == opponent.getGoals();
        String resultChar = isWin ? "W" : (isDraw ? "D" : "L");

        for (Match.PlayerStats ps : side.getPlayers()) {
            String playerId = ps.getPlayerId();
            if (!activePlayerIds.contains(playerId)) continue;

            String alias = playerRepository.findById(playerId)
                    .map(pl -> pl.getAlias())
                    .orElse("Nieznany");

            StatsDto.PlayerForm currentForm = formsMap.get(playerId);
            List<String> lastMatches = currentForm != null ? new ArrayList<>(currentForm.lastMatches()) : new ArrayList<>();
            lastMatches.add(resultChar);
            if (lastMatches.size() > 5) {
                lastMatches.remove(0);
            }

            BigDecimal currentElo = ps.getLiveRating() != null ? ps.getLiveRating() : BigDecimal.valueOf(1000);
            formsMap.put(playerId, new StatsDto.PlayerForm(playerId, alias, lastMatches, currentElo));

            StatsDto.EloChartLine chartLine = eloChartMap.computeIfAbsent(alias, k -> new StatsDto.EloChartLine(alias, new ArrayList<>()));
            chartLine.history().add(new StatsDto.EloPoint(match.getCreatedAt(), currentElo));
        }
    }

    private void processMatchForRelations(Match match,
                                          Map<String, Map<String, StatsDto.Relation>> withMap,
                                          Map<String, Map<String, StatsDto.Relation>> againstMap,
                                          Set<String> activePlayerIds) {
        List<String> homePlayers = match.getHomeSide().getPlayers().stream().map(Match.PlayerStats::getPlayerId).toList();
        List<String> awayPlayers = match.getAwaySide().getPlayers().stream().map(Match.PlayerStats::getPlayerId).toList();

        updateRelations(homePlayers, homePlayers, match.getHomeSide().getGoals() > match.getAwaySide().getGoals(), match.getHomeSide().getGoals(), match.getAwaySide().getGoals(), withMap, true, activePlayerIds);
        updateRelations(awayPlayers, awayPlayers, match.getAwaySide().getGoals() > match.getHomeSide().getGoals(), match.getAwaySide().getGoals(), match.getHomeSide().getGoals(), withMap, true, activePlayerIds);

        updateRelations(homePlayers, awayPlayers, match.getHomeSide().getGoals() > match.getAwaySide().getGoals(), match.getHomeSide().getGoals(), match.getAwaySide().getGoals(), againstMap, false, activePlayerIds);
        updateRelations(awayPlayers, homePlayers, match.getAwaySide().getGoals() > match.getHomeSide().getGoals(), match.getAwaySide().getGoals(), match.getHomeSide().getGoals(), againstMap, false, activePlayerIds);
    }

    private void updateRelations(List<String> subjects, List<String> targets, boolean isWin, int goalsScored, int goalsConceded,
                                 Map<String, Map<String, StatsDto.Relation>> relationMap, boolean isPartner, Set<String> activePlayerIds) {
        for (String subId : subjects) {
            if (!activePlayerIds.contains(subId)) continue;

            for (String tarId : targets) {
                if (subId.equals(tarId) && isPartner) continue;
                if (!activePlayerIds.contains(tarId)) continue;

                String targetAlias = playerRepository.findById(tarId).map(p -> p.getAlias()).orElse("Nieznany");

                Map<String, StatsDto.Relation> subRelations = relationMap.computeIfAbsent(subId, k -> new HashMap<>());
                StatsDto.Relation rel = subRelations.get(targetAlias);

                int matches = rel != null ? rel.matches() + 1 : 1;
                int wins = rel != null ? rel.wins() + (isWin ? 1 : 0) : (isWin ? 1 : 0);
                int scored = rel != null ? rel.goalsScoredForTeam() + goalsScored : goalsScored;
                int lost = rel != null ? rel.goalsLostForTeam() + goalsConceded : goalsConceded;

                subRelations.put(targetAlias, new StatsDto.Relation(targetAlias, matches, wins, scored, lost));
            }
        }
    }

    private List<StatsDto.PlayerRelations> buildRelationsList(Map<String, Map<String, StatsDto.Relation>> withMap,
                                                              Map<String, Map<String, StatsDto.Relation>> againstMap,
                                                              Set<String> activePlayerIds) {
        List<StatsDto.PlayerRelations> list = new ArrayList<>();
        for (String playerId : activePlayerIds) {
            String alias = playerRepository.findById(playerId).map(p -> p.getAlias()).orElse("Nieznany");

            List<StatsDto.Relation> playedWith = withMap.containsKey(playerId) ?
                    new ArrayList<>(withMap.get(playerId).values()) : List.of();
            List<StatsDto.Relation> playedAgainst = againstMap.containsKey(playerId) ?
                    new ArrayList<>(againstMap.get(playerId).values()) : List.of();

            list.add(new StatsDto.PlayerRelations(playerId, alias, playedWith, playedAgainst));
        }
        return list;
    }

    private List<StatsDto.FunFact> calculateFunFacts(List<Match> matches, List<StatsDto.PlayerForm> activeForms) {
        // Logika ciekawostek
        return new ArrayList<>();
    }
}