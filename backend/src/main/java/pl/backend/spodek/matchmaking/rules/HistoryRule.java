package pl.backend.spodek.matchmaking.rules;

import org.springframework.stereotype.Component;
import pl.backend.spodek.matchmaking.MatchmakingProperties;
import pl.backend.spodek.matchmaking.model.MatchContext;
import pl.backend.spodek.matchmaking.model.RuleResult;

@Component
public class HistoryRule implements MatchScoringRule {

    @Override
    public RuleResult evaluate(MatchContext ctx, MatchmakingProperties properties) {
        int penalty = 0;
        MatchmakingProperties.Weights.History hProps = properties.getWeights().getHistory();

        penalty += ctx.home1().getPlayedWith().getOrDefault(ctx.home2().getId(), 0) * hProps.getSameTeamPenalty();
        penalty += ctx.away1().getPlayedWith().getOrDefault(ctx.away2().getId(), 0) * hProps.getSameTeamPenalty();

        penalty += ctx.home1().getPlayedAgainst().getOrDefault(ctx.away1().getId(), 0) * hProps.getSameOpponentPenalty();
        penalty += ctx.home1().getPlayedAgainst().getOrDefault(ctx.away2().getId(), 0) * hProps.getSameOpponentPenalty();
        penalty += ctx.home2().getPlayedAgainst().getOrDefault(ctx.away1().getId(), 0) * hProps.getSameOpponentPenalty();
        penalty += ctx.home2().getPlayedAgainst().getOrDefault(ctx.away2().getId(), 0) * hProps.getSameOpponentPenalty();

        return new RuleResult(penalty, penalty > 0 ? "Powtórki składów" : null);
    }
}