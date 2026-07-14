package pl.backend.spodek.dto;

import java.math.BigDecimal;
import java.util.List;

public class MatchmakingDto {

    public record Request(
            String seasonId,
            int matchweek
    ) {}

    public record PlayerInfo(
            String playerId,
            String alias,
            BigDecimal currentElo,
            int matchesPlayedToday
    ) {}

    public record Suggestion(
            List<PlayerInfo> homePlayers,
            List<PlayerInfo> awayPlayers,
            double matchScore,
            String matchReason
    ) {}
}