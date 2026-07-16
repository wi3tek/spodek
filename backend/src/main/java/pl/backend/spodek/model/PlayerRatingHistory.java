package pl.backend.spodek.model;

import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import java.math.BigDecimal;

@Document(collection = "player_rating_history")
@Data
@Builder
@EqualsAndHashCode(callSuper = true)
@CompoundIndexes({
        // 1. Obsługuje: findFirstByLeagueIdAndPlayerIdOrderByCreatedAtDesc (Eksperckie dopasowanie ESR pod historię gracza)
        @CompoundIndex(name = "prh_league_player_created_idx", def = "{'leagueId': 1, 'playerId': 1, 'createdAt': -1}"),

        // 2. Obsługuje: findByLeagueIdOrderByCreatedAtAsc oraz deleteByLeagueIdAndCreatedAtGreaterThanEqual
        @CompoundIndex(name = "prh_league_created_idx", def = "{'leagueId': 1, 'createdAt': 1}")
})
public class PlayerRatingHistory extends BaseDocument {

    @Id
    private String id;
    private String playerId;
    private String matchId;     // Powiązanie z meczem, który wywołał zmianę
    private String leagueId;    // Do szybkiego filtrowania rankingu w lidze

    private BigDecimal ratingBefore; // Stan przed meczem
    private BigDecimal ratingAfter;  // Stan po meczu
    private BigDecimal ratingDifference; // O ile się zmienił (zyskano/stracono)
}
