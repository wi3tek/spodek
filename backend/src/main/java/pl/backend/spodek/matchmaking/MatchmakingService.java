package pl.backend.spodek.matchmaking;

import com.google.common.collect.Sets;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pl.backend.spodek.dto.MatchmakingDto;
import pl.backend.spodek.matchmaking.model.MatchContext;
import pl.backend.spodek.matchmaking.model.PlayerContext;
import pl.backend.spodek.matchmaking.model.RuleResult;
import pl.backend.spodek.matchmaking.rules.MatchScoringRule;
import pl.backend.spodek.model.Match;
import pl.backend.spodek.model.Matchweek;
import pl.backend.spodek.model.Player;
import pl.backend.spodek.model.PlayerRatingHistory;
import pl.backend.spodek.rating.config.RatingProperties;
import pl.backend.spodek.repository.MatchRepository;
import pl.backend.spodek.repository.MatchweekRepository;
import pl.backend.spodek.repository.PlayerRatingHistoryRepository;
import pl.backend.spodek.repository.PlayerRepository;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchmakingService {

    private final MatchRepository matchRepository;
    private final PlayerRepository playerRepository;
    private final MatchweekRepository matchweekRepository;
    private final PlayerRatingHistoryRepository ratingRepository;

    // WSTRZYKNIĘTE KONFIGURACJE I REGUŁY
    private final MatchmakingProperties matchmakingProperties;
    private final RatingProperties ratingProperties;
    private final List<MatchScoringRule> scoringRules;

    public List<MatchmakingDto.Suggestion> generateSuggestions(MatchmakingDto.Request request) {
        log.info("Rozpoczynam przygotowanie sugerowanych meczów. Sezon: {}, Kolejka: {}", request.seasonId(),
                request.matchweek());

        Optional<Matchweek> matchweekOpt = matchweekRepository.findBySeasonIdAndMatchweek(request.seasonId(), request.matchweek());
        if (matchweekOpt.isEmpty() || matchweekOpt.get().getPresentPlayerIds().size() < 4) {
            log.warn("Za mało graczy na kanapie do stworzenia meczu!");
            return Collections.emptyList();
        }

        List<String> presentIds = matchweekOpt.get().getPresentPlayerIds();
        List<Match> matchesToday = matchRepository.findBySeasonIdAndMatchweek(request.seasonId(), request.matchweek())
                .stream().sorted(Comparator.comparing(Match::getCreatedAt)).toList();
        String leagueId = matchesToday.isEmpty() ? null : matchesToday.getFirst().getLeagueId();

        Map<String, PlayerContext> contextMap = buildPlayerContexts(presentIds, matchesToday, leagueId);
        Set<Set<String>> foursomes = Sets.combinations(new HashSet<>(presentIds), 4);
        List<EvaluatedMatch> allPossibilities = new ArrayList<>();

        for (Set<String> foursome : foursomes) {
            List<String> f = new ArrayList<>(foursome);
            String p1 = f.get(0), p2 = f.get(1), p3 = f.get(2), p4 = f.get(3);
            List<String> benchIds = presentIds.stream().filter(id -> !foursome.contains(id)).toList();

            allPossibilities.add(evaluateMatch(p1, p2, p3, p4, benchIds, contextMap));
            allPossibilities.add(evaluateMatch(p1, p3, p2, p4, benchIds, contextMap));
            allPossibilities.add(evaluateMatch(p1, p4, p2, p3, benchIds, contextMap));
        }

        allPossibilities.sort(Comparator.comparingDouble(EvaluatedMatch::getPenaltyScore));

        return allPossibilities.stream().limit(15).map(this::mapToDto).toList();
    }

    // --- CZYSTY, WZORCOWY EVALUATOR ---
    private EvaluatedMatch evaluateMatch(String t1p1, String t1p2, String t2p1, String t2p2, List<String> benchIds, Map<String, PlayerContext> contextMap) {
        MatchContext context = new MatchContext(
                contextMap.get(t1p1), contextMap.get(t1p2),
                contextMap.get(t2p1), contextMap.get(t2p2),
                benchIds, contextMap
        );

        double totalPenalty = 0.0;
        List<String> reasons = new ArrayList<>();

        // Magia polimorfizmu - przelatujemy przez wszystkie wstrzyknięte reguły
        for (MatchScoringRule rule : scoringRules) {
            RuleResult result = rule.evaluate(context, matchmakingProperties);
            if (result.penalty() != 0 || result.reason() != null) {
                totalPenalty += result.penalty();
                if (result.reason() != null && !result.reason().isBlank()) {
                    reasons.add(result.reason());
                }
            }
        }

        String primaryReason = reasons.isEmpty() ? "Święty Graal (Brak Kar)" : String.join(", ", reasons);
        return new EvaluatedMatch(List.of(context.home1(), context.home2()), List.of(context.away1(), context.away2()), totalPenalty, primaryReason);
    }

    private MatchmakingDto.Suggestion mapToDto(EvaluatedMatch em) {
        List<MatchmakingDto.PlayerInfo> home = em.home.stream().map(p -> new MatchmakingDto.PlayerInfo(p.getId(), p.getAlias(), p.getElo(), p.getTotalPlayed())).toList();
        List<MatchmakingDto.PlayerInfo> away = em.away.stream().map(p -> new MatchmakingDto.PlayerInfo(p.getId(), p.getAlias(), p.getElo(), p.getTotalPlayed())).toList();
        return new MatchmakingDto.Suggestion(home, away, em.penaltyScore, em.reason);
    }

    private Map<String, PlayerContext> buildPlayerContexts(List<String> presentIds, List<Match> matchesToday, String leagueId) {
        Map<String, PlayerContext> map = new HashMap<>();
        List<Player> players = playerRepository.findAllById(presentIds);

        for (Player p : players) {
            BigDecimal elo = (leagueId != null) ?
                    ratingRepository.findFirstByLeagueIdAndPlayerIdOrderByCreatedAtDesc(leagueId, p.getId())
                            .map(PlayerRatingHistory::getRatingAfter).orElse(ratingProperties.getDefaultStartRating())
                    : ratingProperties.getDefaultStartRating();
            map.put(p.getId(), new PlayerContext(p.getId(), p.getAlias(), elo));
        }

        for (Match match : matchesToday) {
            Set<String> homeIds = extractIds(match.getHomeSide());
            Set<String> awayIds = extractIds(match.getAwaySide());
            Set<String> playedInMatch = new HashSet<>(homeIds);
            playedInMatch.addAll(awayIds);

            for (String id : presentIds) {
                PlayerContext ctx = map.get(id);
                if (playedInMatch.contains(id)) {
                    ctx.setTotalPlayed(ctx.getTotalPlayed() + 1);
                    ctx.setConsecutivePlayed(ctx.getConsecutivePlayed() + 1);
                    ctx.setConsecutiveBenched(0);
                } else {
                    ctx.setConsecutiveBenched(ctx.getConsecutiveBenched() + 1);
                    ctx.setConsecutivePlayed(0);
                }
            }
            updateHistoryMap(homeIds, homeIds, map, true);
            updateHistoryMap(awayIds, awayIds, map, true);
            updateHistoryMap(homeIds, awayIds, map, false);
            updateHistoryMap(awayIds, homeIds, map, false);
        }
        return map;
    }

    private void updateHistoryMap(Set<String> groupA, Set<String> groupB, Map<String, PlayerContext> map, boolean isTeammate) {
        for (String idA : groupA) {
            PlayerContext ctxA = map.get(idA);
            if (ctxA == null) continue;
            for (String idB : groupB) {
                if (idA.equals(idB)) continue;
                if (isTeammate) {
                    ctxA.getPlayedWith().merge(idB, 1, Integer::sum);
                } else {
                    ctxA.getPlayedAgainst().merge(idB, 1, Integer::sum);
                }
            }
        }
    }

    private Set<String> extractIds(Match.MatchSide side) {
        if (side == null || side.getPlayers() == null) return Collections.emptySet();
        return side.getPlayers().stream().map(Match.PlayerStats::getPlayerId).collect(Collectors.toSet());
    }

    @Data
    private static class EvaluatedMatch {
        final List<PlayerContext> home;
        final List<PlayerContext> away;
        final double penaltyScore;
        final String reason;
    }
}