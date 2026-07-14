package pl.backend.spodek.matchmaking.model;

import lombok.Data;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Data
public class PlayerContext {
    private final String id;
    private final String alias;
    private final BigDecimal elo;
    private int totalPlayed = 0;
    private int consecutivePlayed = 0;
    private int consecutiveBenched = 0;
    private Map<String, Integer> playedWith = new HashMap<>();
    private Map<String, Integer> playedAgainst = new HashMap<>();
}