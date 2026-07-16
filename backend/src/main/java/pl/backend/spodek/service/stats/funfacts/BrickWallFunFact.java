package pl.backend.spodek.service.stats.funfacts;

import org.springframework.stereotype.Component;
import pl.backend.spodek.dto.FunFact;
import pl.backend.spodek.service.stats.FunFactInput;

import java.util.List;
import java.util.Optional;

@Component
public class BrickWallFunFact implements FunFactService {
    @Override
    public Optional<FunFact> generateFact(FunFactInput input) {
        double bestDef = 999.0;
        String brickWall = null;
        for (var entry : input.getPlayerTotalTracker().entrySet()) {
            if (!input.getActivePlayerIds().contains( entry.getKey() )) continue;

            if (entry.getValue().getMatches() >= 5) {
                double avgLost = (double) entry.getValue().getGoalsAgainst() / entry.getValue().getMatches();
                if (avgLost < bestDef) {
                    bestDef = avgLost;
                    brickWall = entry.getKey();
                }
            }
        }
        if (brickWall != null && input.getPlayersMap().containsKey(brickWall)) {
            String description = "Bardziej defensywnie się nie da";
            var item = new FunFact.FunFactItem(
                    input.getPlayersMap().get(brickWall).getAlias(),
                    "traci średnio tylko " + String.format("%.1f", bestDef) + " goli/mecz"
            );
            return Optional.of(new FunFact("Murarz", description, "🧱", List.of(item)));
        }

        return Optional.empty();
    }
}
