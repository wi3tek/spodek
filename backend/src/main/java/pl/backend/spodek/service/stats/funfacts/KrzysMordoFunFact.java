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

@Component
public class KrzysMordoFunFact implements FunFactService {

    private static final String TITLE = "Krzyś Mordo";
    private static final String ICON = "🚀";

    @Override
    public Optional<FunFact> generateFact(FunFactInput input) {
        if (input.getTargetMatches() == null || input.getTargetMatches().isEmpty()) {
            return Optional.empty();
        }

        LocalDateTime minDate = input.getTargetMatches().stream().map(Match::getCreatedAt).min(LocalDateTime::compareTo).orElse(null);
        LocalDateTime maxDate = input.getTargetMatches().stream().map(Match::getCreatedAt).max(LocalDateTime::compareTo).orElse(null);

        if (minDate == null || maxDate == null) return Optional.empty();

        String bestPlayer = null;
        BigDecimal maxGain = BigDecimal.ZERO;

        for (String pId : input.getActivePlayerIds()) {
            List<PlayerRatingHistory> pHistory = input.getRatingHistory().stream()
                    .filter(rh -> rh.getPlayerId().equals(pId))
                    .toList();

            BigDecimal startElo = BigDecimal.valueOf(1000);
            PlayerRatingHistory lastBefore = pHistory.stream()
                    .filter(rh -> rh.getCreatedAt().isBefore(minDate))
                    .max(Comparator.comparing(PlayerRatingHistory::getCreatedAt))
                    .orElse(null);
            if (lastBefore != null) startElo = lastBefore.getRatingAfter();

            PlayerRatingHistory lastInScope = pHistory.stream()
                    .filter(rh -> !rh.getCreatedAt().isAfter(maxDate) && !rh.getCreatedAt().isBefore(minDate))
                    .max(Comparator.comparing(PlayerRatingHistory::getCreatedAt))
                    .orElse(null);

            if (lastInScope != null) {
                BigDecimal diff = lastInScope.getRatingAfter().subtract(startElo);
                if (diff.compareTo(BigDecimal.ZERO) > 0) { // Jeśli zyskał (różnica dodatnia)
                    if (diff.compareTo(maxGain) > 0) {
                        maxGain = diff;
                        bestPlayer = pId;
                    }
                }
            }
        }

        if (bestPlayer != null && maxGain.compareTo(BigDecimal.ZERO) > 0) {
            String alias = input.getPlayersMap().get(bestPlayer).getAlias();
            String desc = "Najwiekszy przyrost rainkungu ELO w analizowanym okresie.";
            return Optional.of(new FunFact(TITLE, desc, ICON, List.of(
                    new FunFact.FunFactItem(alias, "+" + maxGain.setScale(0, RoundingMode.HALF_UP) + " ELO")
            )));
        }
        return Optional.empty();
    }
}