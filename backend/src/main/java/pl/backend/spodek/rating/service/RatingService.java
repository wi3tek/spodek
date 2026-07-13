package pl.backend.spodek.rating.service;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.backend.spodek.rating.model.enums.RatingMode;
import pl.backend.spodek.rating.model.request.GamePlayerData;
import pl.backend.spodek.rating.model.request.GameTeamData;
import pl.backend.spodek.rating.model.request.RatingRequest;
import pl.backend.spodek.rating.model.response.RatingResponse;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class RatingService {

    private final ExpectedScoreService expectedScoreService;
    private final ActualScoreService actualScoreService;
    private final GoalsService goalsService;

    private static final BigDecimal MATCH_WEIGHT_INDEX_DEFAULT = BigDecimal.valueOf( 20 ); // im wyższa waga meczu tym większa
    // czułość zmiany ratingu

    public RatingResponse calculateRating(@Valid RatingRequest request) {
        if (request.getTeamA() == null || request.getTeamB() == null)
            throw new RatingException( "Requested teams cannot be null" );

        GameTeamData teamA = request.getTeamA();
        GameTeamData teamB = request.getTeamB();

        Map<String, BigDecimal> actualScores = actualScoreService.calculateActualScores( teamA, teamB );
        Map<String, BigDecimal> expectedScores = expectedScoreService.calculateExpectedScores( teamA, teamB,
                RatingMode.valueOf( request.getMode() ));
        BigDecimal goalsDifferenceIndex = goalsService.calculateGoalsDifferenceIndex( teamA, teamB );
        List<GamePlayerData> players = Stream.concat(
                request.getTeamA().getPlayers().stream(),
                request.getTeamB().getPlayers().stream()
        ).toList();

        return RatingResponse.builder()
                .players( prepareRatingMap( players, actualScores, expectedScores, goalsDifferenceIndex, request.getMatchWeightIndex() ) )
                .build();
    }

    private List<GamePlayerData> prepareRatingMap(
            List<GamePlayerData> players,
            Map<String, BigDecimal> actualScores,
            Map<String, BigDecimal> expectedScores,
            BigDecimal goalsDifferenceIndex,
            BigDecimal matchWeightIndex
    ) {
        return players.stream()
                .map( player -> {
                    BigDecimal actualScore = actualScores.get( player.getId() );
                    BigDecimal expectedScore = expectedScores.get( player.getId() );

                    BigDecimal ratingDifference = calculateRatingDifference( actualScore, expectedScore,
                            goalsDifferenceIndex,matchWeightIndex );

                    return GamePlayerData.builder()
                            .id( player.getId() )
                            .rating( prepareRating( player.getRating(), ratingDifference ) )
                            .ratingDifference( ratingDifference )
                            .build();
                } )
                .toList();
    }

    private BigDecimal prepareRating(
            BigDecimal playerRating,
            BigDecimal ratingDifference

    ) {
        return playerRating.add( ratingDifference );
    }

    private BigDecimal calculateRatingDifference(BigDecimal actualScore, BigDecimal expectedScore, BigDecimal goalsDifferenceIndex, BigDecimal matchWeightIndex) {
        return Optional.ofNullable(matchWeightIndex).orElse( MATCH_WEIGHT_INDEX_DEFAULT )
                .multiply( goalsDifferenceIndex )
                .multiply( actualScore.subtract( expectedScore ) )
                .divide( new BigDecimal( 1 ), 0,
                        RoundingMode.HALF_UP );
    }
}
