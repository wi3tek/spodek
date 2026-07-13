package pl.backend.spodek.model;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.List;

@Document(collection = "matches")
@Data
@EqualsAndHashCode(callSuper = true)
public class Match extends BaseDocument {
    @Id
    private String id;
    private String seasonId;
    private String leagueId;
    private int matchweek;

    private MatchSide homeSide;
    private MatchSide awaySide;
    private boolean finished;

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