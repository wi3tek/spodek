package pl.backend.spodek.rating.model.response;

import lombok.Builder;
import lombok.Data;
import pl.backend.spodek.rating.model.request.GamePlayerData;

import java.util.List;

@Data
@Builder
public class RatingResponse {
    private List<GamePlayerData> players;
}
