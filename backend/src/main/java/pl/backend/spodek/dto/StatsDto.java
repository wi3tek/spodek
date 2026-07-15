package pl.backend.spodek.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class StatsDto {

    public record Response(
            List<PlayerForm> forms,
            List<EloChartLine> eloChart,
            List<PlayerRelations> relations,
            List<FunFact> funFacts
    ) {}

    public record PlayerForm(String playerId, String alias, List<String> lastMatches, BigDecimal currentElo) {}
    public record EloChartLine(String alias, List<EloPoint> history) {}
    public record EloPoint(LocalDateTime date, BigDecimal elo) {}
    public record PlayerRelations(String playerId, String alias, List<Relation> playedWith, List<Relation> playedAgainst) {}
    public record Relation(String opponentOrPartnerAlias, int matches, int wins, int goalsScoredForTeam, int goalsLostForTeam) {}
    public record FunFact(String title, String description, String icon) {}
}