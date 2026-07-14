package pl.backend.spodek.matchmaking.rules;

import pl.backend.spodek.matchmaking.MatchmakingProperties;
import pl.backend.spodek.matchmaking.model.MatchContext;
import pl.backend.spodek.matchmaking.model.RuleResult;

public interface MatchScoringRule {
    RuleResult evaluate(MatchContext context, MatchmakingProperties properties);
}