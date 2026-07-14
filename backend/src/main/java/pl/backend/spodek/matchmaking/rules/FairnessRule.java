package pl.backend.spodek.matchmaking.rules;

import org.springframework.stereotype.Component;
import pl.backend.spodek.matchmaking.MatchmakingProperties;
import pl.backend.spodek.matchmaking.model.MatchContext;
import pl.backend.spodek.matchmaking.model.PlayerContext;
import pl.backend.spodek.matchmaking.model.RuleResult;

@Component
public class FairnessRule implements MatchScoringRule {
    @Override
    public RuleResult evaluate(MatchContext context, MatchmakingProperties properties) {
        // Tu również możemy użyć mapToInt dla zachowania spójności
        int maxPitchPlayed = context.getAllPlayers().stream()
                .mapToInt(PlayerContext::getTotalPlayed)
                .max()
                .orElse(0);

        // ZMIANA: używamy mapToInt() zamiast map()
        int minBenchPlayed = context.benchIds().stream()
                .mapToInt(id -> context.contextMap().get(id).getTotalPlayed())
                .min()
                .orElse(Integer.MAX_VALUE);

        if (!context.benchIds().isEmpty() && maxPitchPlayed > minBenchPlayed) {
            double penalty = (maxPitchPlayed - minBenchPlayed) * properties.getWeights().getGlobalMatchDifferencePenalty();
            return new RuleResult(penalty, "Wymagana rotacja z ławką!");
        }
        return new RuleResult(0, null);
    }
}