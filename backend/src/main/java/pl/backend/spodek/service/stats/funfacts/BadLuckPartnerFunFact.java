package pl.backend.spodek.service.stats.funfacts;

import org.springframework.stereotype.Component;
import pl.backend.spodek.dto.FunFact;
import pl.backend.spodek.service.stats.FunFactInput;
import pl.backend.spodek.service.stats.model.MatchTracker;

import java.util.List;
import java.util.Optional;

@Component
public class BadLuckPartnerFunFact implements FunFactService {

    private static final String TITLE = "Z Wietkiem się przegrywa";
    private static final String ICON = "🤦‍♂️";

    @Override
    public Optional<FunFact> generateFact(FunFactInput input) {
        String worstPartnerId = null;
        int maxLosses = -1;

        // Bierzemy pod uwagę całościowy tracker gracza z obecnego zestawu meczów
        for (String pId : input.getActivePlayerIds()) {
            MatchTracker tr = input.getPlayerTotalTracker().get(pId);
            if (tr != null && tr.getLosses() > maxLosses) {
                maxLosses = tr.getLosses();
                worstPartnerId = pId;
            }
        }

        if (worstPartnerId != null && maxLosses > 0) {
            String alias = input.getPlayersMap().get(worstPartnerId).getAlias();
            String desc = "Gracz, z którym obecność na boisku najczęściej zwiastuje porażkę.";

            return Optional.of(new FunFact(TITLE, desc, ICON, List.of(
                    new FunFact.FunFactItem(alias, maxLosses + " porażek (łącznie)")
            )));
        }

        return Optional.empty();
    }
}