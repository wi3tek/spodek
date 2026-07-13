package pl.backend.spodek.rating.service;

import org.springframework.stereotype.Service;
import pl.backend.spodek.rating.model.enums.RatingMode;
import pl.backend.spodek.rating.model.request.GameTeamData;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;


@Service
class ExpectedScoreService {

    private static final BigDecimal RATING_DIFFERENCE_INDEX = BigDecimal.valueOf( 400 );

    Map<String, BigDecimal> calculateExpectedScores(
            GameTeamData teamA,
            GameTeamData teamB,
            RatingMode ratingMode
    ) {
        Map<String, BigDecimal> expectedScores = new HashMap<>();

        BigDecimal teamRatingA = prepareTeamBaseRating( teamA );
        BigDecimal teamRatingB = prepareTeamBaseRating( teamB );

        teamA.getPlayers().forEach( player -> expectedScores.put( player.getId(),
                prepareExpectedScore( player.getRating(), teamRatingA, teamRatingB, ratingMode )
        ) );
        teamB.getPlayers().forEach( player -> expectedScores.put( player.getId(),
                prepareExpectedScore( player.getRating(), teamRatingB, teamRatingA, ratingMode )
        ) );

        return expectedScores;
    }

    private BigDecimal prepareExpectedScore(
            BigDecimal playerRating,
            BigDecimal playerTeamRating,
            BigDecimal opponentTeamRating,
            RatingMode ratingMode
    ) {
        BigDecimal playerBaseRating = switch (ratingMode) {
            case SINGLE -> playerRating;
            case TEAM -> playerTeamRating;
        };
        double poweredGoals = Math.pow( 10, preparePower( playerBaseRating, opponentTeamRating ) );
        return BigDecimal.ONE
                .divide( (BigDecimal.ONE.add( BigDecimal.valueOf( poweredGoals ) )), 5, RoundingMode.CEILING );
    }

    private static Double preparePower(BigDecimal teamRating, BigDecimal opponentRating) {
        return (opponentRating.subtract( teamRating ))
                .divide( RATING_DIFFERENCE_INDEX,
                        5,
                        RoundingMode.CEILING
                ).doubleValue();
    }

    private BigDecimal prepareTeamBaseRating(GameTeamData team) {
        int teamSize = team.getPlayers().size();
        return switch (teamSize) {
            case 1 -> team.getPlayers().get( 0 ).getRating();
            case 2 -> {
                BigDecimal player1Rating = team.getPlayers().get( 0 ).getRating();
                BigDecimal player2Rating = team.getPlayers().get( 1 ).getRating();
                yield (player1Rating.add( player2Rating ))
                        .divide(
                                new BigDecimal( teamSize ),
                                5,
                                RoundingMode.CEILING
                        );
            }
            default -> throw new RatingException( "Invalid team player list size" );
        };

    }
}
