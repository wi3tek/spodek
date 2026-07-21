package pl.backend.spodek.service.stats.funfacts;

import org.springframework.stereotype.Component;
import pl.backend.spodek.dto.FunFact;
import pl.backend.spodek.service.stats.FunFactInput;

import java.util.List;
import java.util.Optional;

@Component
public class GoldenDuoFunFact implements FunFactService {
    private static final String TITLE = "Solidne synki";
    private static final String ICON = "🤝";

    @Override
    public Optional<FunFact> generateFact(FunFactInput input) {
        return findBestRelation(input.getPlayedWith(), 3, true, input.getActivePlayerIds())
                .map(r -> {
                    String description = "Bardzo dobre synki";
                    var item = new FunFact.FunFactItem(
                            input.getPlayersMap().get(r.p1()).getAlias() + " & " + input.getPlayersMap().get(r.p2()).getAlias(),
                            Math.round(r.ratio() * 100) + "% wygranych meczów"
                    );
                    return new FunFact(TITLE, description, ICON, List.of(item));
                });
    }
}
