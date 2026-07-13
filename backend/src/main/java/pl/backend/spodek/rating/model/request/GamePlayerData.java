package pl.backend.spodek.rating.model.request;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class GamePlayerData {

    @NotNull(message = "Player id cannot be null")
    private String id;

    @NotNull(message = "Rating cannot be null")
    private BigDecimal rating;

    private BigDecimal ratingDifference;
}
