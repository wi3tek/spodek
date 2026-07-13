package pl.backend.spodek.rating.model.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class GameTeamData {

    @NotNull(message = "Goals cannot be null")
    @Min(value = 0, message = "Goals cannot be less than 0")
    @Max(value = 99, message = "Team has scored too many goals ;)")
    private Integer goals;

    @NotEmpty(message = "Players list cannot be empty")
    @Max(value = 2)
    private List<GamePlayerData> players;

    private Integer teamOverallRating;
}
