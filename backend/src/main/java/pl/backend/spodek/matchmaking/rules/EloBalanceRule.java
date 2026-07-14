package pl.backend.spodek.matchmaking.rules;

import org.springframework.stereotype.Component;
import pl.backend.spodek.matchmaking.MatchmakingProperties;
import pl.backend.spodek.matchmaking.model.MatchContext;
import pl.backend.spodek.matchmaking.model.RuleResult;

@Component
public class EloBalanceRule implements MatchScoringRule {
    @Override
    public RuleResult evaluate(MatchContext ctx, MatchmakingProperties properties) {
        double homeElo = ctx.home1().getElo().doubleValue() + ctx.home2().getElo().doubleValue();
        double awayElo = ctx.away1().getElo().doubleValue() + ctx.away2().getElo().doubleValue();
        double eloDiff = Math.abs(homeElo - awayElo);

        double penalty = eloDiff * properties.getWeights().getElo().getDifferenceWeight();
        return new RuleResult(penalty, eloDiff < 50 ? "Dobry balans sił" : null);
    }
}