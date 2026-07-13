package pl.backend.spodek.rating.service;

import org.springframework.stereotype.Service;
import pl.backend.spodek.rating.model.enums.GameResult;
import pl.backend.spodek.rating.model.request.GameTeamData;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Service
class ActualScoreService {

    Map<String, BigDecimal> calculateActualScores(GameTeamData teamA, GameTeamData teamB) {
        Map<String, BigDecimal> actualPlayersScore = new HashMap<>();

        BigDecimal teamAScore = prepareScore( teamA.getGoals(), teamB.getGoals() );
        BigDecimal teamBScore = prepareScore( teamB.getGoals(), teamA.getGoals() );

        teamA.getPlayers().forEach( player -> actualPlayersScore.put( player.getId(), teamAScore ) );
        teamB.getPlayers().forEach( player -> actualPlayersScore.put( player.getId(), teamBScore ) );

        return actualPlayersScore;
    }

    private BigDecimal prepareScore(
            Integer teamGoals,
            Integer opponentGoals
    ) {
        int result = teamGoals.compareTo( opponentGoals );
        GameResult gameResult = switch (result) {
            case 0 -> GameResult.DRAW;
            case 1 -> GameResult.WIN;
            case -1 -> GameResult.LOSE;
            default -> throw new RatingException( "Unexpected error while preparing score" );
        };

        return BigDecimal.valueOf(gameResult.getResultValue());
    }
}
