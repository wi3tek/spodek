package pl.backend.spodek.matchmaking.model;

import java.util.List;
import java.util.Map;

public record MatchContext(
        PlayerContext home1, PlayerContext home2,
        PlayerContext away1, PlayerContext away2,
        List<String> benchIds,
        Map<String, PlayerContext> contextMap
) {
    public List<PlayerContext> getAllPlayers() {
        return List.of(home1, home2, away1, away2);
    }
}