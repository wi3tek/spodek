package pl.backend.spodek.service.stats.funfacts;

import org.springframework.stereotype.Component;
import pl.backend.spodek.dto.FunFact;
import pl.backend.spodek.service.stats.FunFactInput;

import java.util.List;
import java.util.Optional;

@Component
public class FreeWinFunFact implements FunFactService {

    @Override
    public Optional<FunFact> generateFact(FunFactInput input) {
        return findBestRelation(input.getPlayedAgainst(), 3, true, input.getActivePlayerIds())
                .map(r -> {
                    String description = "Najbardziej jednostronne pojedynki w lidze.";
                    var item = new FunFact.FunFactItem(
                            input.getPlayersMap().get(r.p1()).getAlias() + " vs " + input.getPlayersMap().get(r.p2()).getAlias(),
                            input.getPlayersMap().get(r.p1()).getAlias() + " ma " + Math.round(r.ratio() * 100) +" wygranych pojedynków"

                    );
                    return new FunFact("Darmowe punkty", description, "🎯", List.of(item));
                });
    }
}
