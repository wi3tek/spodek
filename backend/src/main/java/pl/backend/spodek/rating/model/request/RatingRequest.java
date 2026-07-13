package pl.backend.spodek.rating.model.request;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class RatingRequest {

    @NotNull(message = "Team A cannot be null")
    private GameTeamData teamA;

    @NotNull(message = "Team A cannot be null")
    private GameTeamData teamB;

    @NotNull(message = "Rating mode cannot be null")
    private String mode;

    private BigDecimal matchWeightIndex;

}
