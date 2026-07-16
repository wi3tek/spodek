package pl.backend.spodek.service.stats.funfacts;

import org.springframework.stereotype.Component;
import pl.backend.spodek.dto.FunFact;
import pl.backend.spodek.service.stats.FunFactInput;

import java.util.List;
import java.util.Optional;

@Component
public class ClubLoyaltyFunFact implements FunFactService {
    private static final String TITLE = "Lojalność Klubowa";
    private static final String ICON = "🛡️";

    @Override
    public Optional<FunFact> generateFact(FunFactInput input) {
        double bestClubWr = -1.0;
        String loyalPlayer = null;
        String loyalClubId = null;

        for (var entry : input.getClubPerformanceMap().entrySet()) {
            if (!input.getActivePlayerIds().contains(entry.getKey())) continue;
            for (var clubEntry : entry.getValue().entrySet()) {
                if (clubEntry.getValue().getMatches() >= 4) {
                    double wr = (double) clubEntry.getValue().getWins() / clubEntry.getValue().getMatches();
                    if (wr > bestClubWr) {
                        bestClubWr = wr; loyalPlayer = entry.getKey(); loyalClubId = clubEntry.getKey();
                    }
                }
            }
        }
        if (bestClubWr >= 0 && input.getPlayersMap().containsKey(loyalPlayer)) {
            var loyalT = input.getTeamsMap().get(loyalClubId);
            String clubName = loyalT != null ? (loyalT.getAlias() != null ? loyalT.getAlias() : loyalT.getName()) : "Nieznana";

            String description = "Ten gracz odnalazł swój absolutnie idealny wirtualny klub.";
            var item = new FunFact.FunFactItem(
                    input.getPlayersMap().get(loyalPlayer).getAlias() + " & " + clubName,
                    Math.round(bestClubWr * 100) + "% wygranych"
            );
            return Optional.of(new FunFact(TITLE, description, ICON, List.of(item)));
        }
        return Optional.empty();
    }
}