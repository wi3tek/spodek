package pl.backend.spodek.service.stats.funfacts;

import org.springframework.stereotype.Component;
import pl.backend.spodek.dto.FunFact;
import pl.backend.spodek.service.stats.FunFactInput;
import pl.backend.spodek.service.stats.model.MatchTracker;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Component
public class FavoritePairFunFact implements FunFactService {

    private static final String TITLE = "Ulubiona Para";
    private static final String ICON = "🤝";

    @Override
    public Optional<FunFact> generateFact(FunFactInput input) {
        int maxGoalsAgainst = -1;
        String p1 = null;
        String p2 = null;
        Set<String> processedPairs = new HashSet<>();

        for (var p1Entry : input.getPlayedWith().entrySet()) {
            if (!input.getActivePlayerIds().contains(p1Entry.getKey())) continue;

            for (var p2Entry : p1Entry.getValue().entrySet()) {
                if (!input.getActivePlayerIds().contains(p2Entry.getKey())) continue;

                // Tworzymy unikalny klucz dla pary, aby nie analizować jej dwa razy
                String pairKey = p1Entry.getKey().compareTo(p2Entry.getKey()) < 0
                        ? p1Entry.getKey() + "-" + p2Entry.getKey()
                        : p2Entry.getKey() + "-" + p1Entry.getKey();

                if (!processedPairs.add(pairKey)) continue;

                MatchTracker tr = p2Entry.getValue();
                // Warunek wejściowy: muszą zagrać przynajmniej kilka razy
                if (tr.getMatches() >= 3 && tr.getGoalsAgainst() > maxGoalsAgainst) {
                    maxGoalsAgainst = tr.getGoalsAgainst();
                    p1 = p1Entry.getKey();
                    p2 = p2Entry.getKey();
                }
            }
        }

        if (p1 != null && p2 != null && maxGoalsAgainst > 0) {
            String alias1 = input.getPlayersMap().get(p1).getAlias();
            String alias2 = input.getPlayersMap().get(p2).getAlias();
            String desc = "To oni stracili razem najwięcej bramek.";

            return Optional.of(new FunFact(TITLE, desc, ICON, List.of(
                    new FunFact.FunFactItem(alias1 + " & " + alias2, maxGoalsAgainst + " straconych bramek")
            )));
        }

        return Optional.empty();
    }
}