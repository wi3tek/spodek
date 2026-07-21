package pl.backend.spodek.service.stats.funfacts;

import org.springframework.stereotype.Component;
import pl.backend.spodek.dto.FunFact;
import pl.backend.spodek.model.Match;
import pl.backend.spodek.model.PlayerRatingHistory;
import pl.backend.spodek.service.stats.FunFactInput;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class DavidAndGoliathFunFact implements FunFactService {

    private static final String TITLE = "Dawid z Goliatem";
    private static final String ICON = "🪨";

    @Override
    public Optional<FunFact> generateFact(FunFactInput input) {
        if (input.getTargetMatches() == null || input.getTargetMatches().isEmpty()) {
            return Optional.empty();
        }

        BigDecimal maxUpsetDiff = BigDecimal.ZERO;
        Match upsetMatch = null;
        boolean homeWasUnderdog = false;

        for (Match m : input.getTargetMatches()) {
            if (m.getHomeSide() == null || m.getHomeSide().getPlayers() == null ||
                    m.getAwaySide() == null || m.getAwaySide().getPlayers() == null) {
                continue;
            }

            // Szacujemy średnie ELO obu drużyn przed gwizdkiem
            BigDecimal homeElo = getAverageEloBeforeMatch(m.getHomeSide().getPlayers(), m.getCreatedAt(), input.getRatingHistory());
            BigDecimal awayElo = getAverageEloBeforeMatch(m.getAwaySide().getPlayers(), m.getCreatedAt(), input.getRatingHistory());

            boolean homeWon = m.getHomeSide().getGoals() > m.getAwaySide().getGoals();
            boolean awayWon = m.getAwaySide().getGoals() > m.getHomeSide().getGoals();

            if (homeWon && awayElo.compareTo(homeElo) > 0) {
                BigDecimal diff = awayElo.subtract(homeElo);
                if (diff.compareTo(maxUpsetDiff) > 0) {
                    maxUpsetDiff = diff;
                    upsetMatch = m;
                    homeWasUnderdog = true;
                }
            } else if (awayWon && homeElo.compareTo(awayElo) > 0) {
                BigDecimal diff = homeElo.subtract(awayElo);
                if (diff.compareTo(maxUpsetDiff) > 0) {
                    maxUpsetDiff = diff;
                    upsetMatch = m;
                    homeWasUnderdog = false;
                }
            }
        }

        // Minimalna różnica 10 ELO między zespołami, żeby uznać to za upset
        if (upsetMatch != null && maxUpsetDiff.compareTo(BigDecimal.valueOf(10)) > 0) {
            Match.MatchSide winners = homeWasUnderdog ? upsetMatch.getHomeSide() : upsetMatch.getAwaySide();
            Match.MatchSide losers = homeWasUnderdog ? upsetMatch.getAwaySide() : upsetMatch.getHomeSide();

            String winnersStr = winners.getPlayers().stream().map(p -> input.getPlayersMap().get(p.getPlayerId()).getAlias()).collect(Collectors.joining(" & "));
            String losersStr = losers.getPlayers().stream().map(p -> input.getPlayersMap().get(p.getPlayerId()).getAlias()).collect(Collectors.joining(" & "));

            String desc = "Zwycięstwo skazanych na porażkę z faworytami";
            return Optional.of(new FunFact(TITLE, desc, ICON, List.of(
                    new FunFact.FunFactItem(winnersStr + " pokonali: " + losersStr, "Zniwelowana różnica: " + maxUpsetDiff.setScale(0, RoundingMode.HALF_UP) + " pkt ELO")
            )));
        }

        return Optional.empty();
    }

    private BigDecimal getAverageEloBeforeMatch(List<Match.PlayerStats> players, LocalDateTime matchTime, List<PlayerRatingHistory> ratingHistory) {
        if (players.isEmpty()) return BigDecimal.valueOf(1000);

        BigDecimal sum = BigDecimal.ZERO;
        for (Match.PlayerStats ps : players) {
            BigDecimal elo = ratingHistory.stream()
                    .filter(rh -> rh.getPlayerId().equals(ps.getPlayerId()) && rh.getCreatedAt().isBefore(matchTime))
                    .max(Comparator.comparing(PlayerRatingHistory::getCreatedAt))
                    .map(PlayerRatingHistory::getRatingAfter)
                    .orElse(BigDecimal.valueOf(1000));
            sum = sum.add(elo);
        }
        return sum.divide(BigDecimal.valueOf(players.size()), 2, RoundingMode.HALF_UP);
    }
}