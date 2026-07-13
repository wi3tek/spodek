package pl.backend.spodek.model;

import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.math.BigDecimal;

@Document(collection = "player_rating_history")
@Data
@Builder
@EqualsAndHashCode(callSuper = true)
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
