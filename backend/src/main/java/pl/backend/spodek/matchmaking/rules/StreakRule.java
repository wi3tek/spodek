package pl.backend.spodek.matchmaking.rules;

import org.springframework.stereotype.Component;
import pl.backend.spodek.matchmaking.MatchmakingProperties;
import pl.backend.spodek.matchmaking.model.MatchContext;
import pl.backend.spodek.matchmaking.model.PlayerContext;
import pl.backend.spodek.matchmaking.model.RuleResult;

import java.util.ArrayList;
import java.util.List;

@Component
public class StreakRule implements MatchScoringRule {
    @Override
    public RuleResult evaluate(MatchContext context, MatchmakingProperties properties) {
        double penalty = 0.0;
        List<String> reasons = new ArrayList<>();
        MatchmakingProperties.Streaks s = properties.getStreaks();

        for (PlayerContext p : context.getAllPlayers()) {
            if (p.getConsecutivePlayed() == 1) penalty += s.getPlayedConsecutive().getLevel1();
            if (p.getConsecutivePlayed() == 2) penalty += s.getPlayedConsecutive().getLevel2();
            if (p.getConsecutivePlayed() == 3) penalty += s.getPlayedConsecutive().getLevel3();
            if (p.getConsecutivePlayed() >= 4) {
                penalty += s.getPlayedConsecutive().getLevel4();
                reasons.add(p.getAlias() + " jest zamęczony");
            }

            if (p.getConsecutiveBenched() == 1) penalty += s.getBenchedConsecutive().getLevel1();
            if (p.getConsecutiveBenched() >= 2) {
                penalty += s.getBenchedConsecutive().getLevel2();
                reasons.add(p.getAlias() + " musi wejść (głód gry)");
            }
        }
        return new RuleResult(penalty, reasons.isEmpty() ? null : String.join(", ", reasons));
    }
}