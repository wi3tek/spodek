package pl.backend.spodek.service.stats.funfacts;

import org.springframework.stereotype.Component;
import pl.backend.spodek.dto.FunFact;
import pl.backend.spodek.service.stats.FunFactInput;

import java.util.List;
import java.util.Optional;

@Component
public class TalismanFunFact implements FunFactService {
    @Override
    public Optional<FunFact> generateFact(FunFactInput input) {
        double bestDiff = -999.0;
        String talisman = null;
        for (var entry : input.getPlayerTotalTracker().entrySet()) {
            if (!input.getActivePlayerIds().contains(entry.getKey())) continue;

            if (entry.getValue().getMatches() >= 5) {
                double avgDiff =
                        (double) (entry.getValue().getGoalsFor() - entry.getValue().getGoalsAgainst()) / entry.getValue().getMatches();
                if (avgDiff > bestDiff) { bestDiff = avgDiff; talisman = entry.getKey(); }
            }
        }
        if (talisman != null && input.getPlayersMap().containsKey(talisman)) {
            String description = "Jego obecność na wirtualnej murawie robi największą różnicę.";
            var item = new FunFact.FunFactItem(
                    input.getPlayersMap().get(talisman).getAlias(),
                    "gwarantuje bilans " + (bestDiff > 0 ? "+" : "") + String.format("%.1f", bestDiff) + " goli na mecz"
            );
            return Optional.of(new FunFact("Talizman", description, "🍀", List.of(item)));
        }

        return Optional.empty();
    }
}
