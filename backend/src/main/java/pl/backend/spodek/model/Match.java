package pl.backend.spodek.model;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "matches")
@Data
@EqualsAndHashCode(callSuper = true)
@CompoundIndexes({
        // 1. Obsługuje: findBySeasonId, findBySeasonIdAndFinished oraz findBySeasonIdOrderByCreatedAtDesc
        @CompoundIndex(name = "match_season_created_idx", def = "{'seasonId': 1, 'finished': 1, 'createdAt': -1}"),

        // 2. Obsługuje: findByLeagueIdAndFinished oraz findByLeagueIdAndFinishedAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc
        @CompoundIndex(name = "match_league_created_idx", def = "{'leagueId': 1, 'finished': 1, 'createdAt': 1}"),

        // 3. Obsługuje: findBySeasonIdAndMatchweek
        @CompoundIndex(name = "match_season_week_idx", def = "{'seasonId': 1, 'matchweek': 1}"),

        // 4. Multikey indeksy dla zapytania $or w countByPlayerInvolvement (MongoDB wymaga osobnych indeksów dla sprawnego $or)
        @CompoundIndex(name = "match_home_players_idx", def = "{'homeSide.players.playerId': 1}"),
        @CompoundIndex(name = "match_away_players_idx", def = "{'awaySide.players.playerId': 1}")
})
public class Match extends BaseDocument {
    @Id
    private String id;
    @Indexed
    private String seasonId;
    private String leagueId;
    private int matchweek;

    private MatchSide homeSide;
    private MatchSide awaySide;
    private boolean finished;
    private List<String> comments = new ArrayList<>();

    @Data
    public static class MatchSide {
        private String teamId;
        private int goals;
        private List<PlayerStats> players;
    }

    @Data
    public static class PlayerStats {
        private String playerId;
        private int yellowCards;
        private int redCards;
        private int goals;
        private int assists;

        // NOWE POLA DLA ELO "NA ŻYWO" - TYLKO DLA TRWAJĄCYCH MECZÓW
        private BigDecimal liveRating;
        private BigDecimal liveRatingDifference;
    }
}