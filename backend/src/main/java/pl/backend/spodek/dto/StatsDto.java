package pl.backend.spodek.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class StatsDto {

    public record Response(
            List<PlayerForm> forms,
            List<EloChartLine> eloChart,
            List<PlayerRelations> relations,
            List<FunFact> funFacts,
            Leaderboards leaderboards // NOWE POLE
    ) {
    }

    // NOWE REKORDY DLA KLASYFIKACJI
    public record Leaderboards(
            List<LeaderboardEntry> topScorers,
            List<LeaderboardEntry> topAssists,
            List<LeaderboardEntry> yellowCards,
            List<LeaderboardEntry> redCards
    ) {
    }

    public record LeaderboardEntry(String alias, int value) {
    }

    // Reszta pozostaje bez zmian...
    // Zaktualizowany rekord w pliku StatsDto.java
    public record PlayerForm(
            String playerId,
            String alias,
            List<String> lastMatches,
            BigDecimal currentElo,
            BigDecimal maxElo,           // NOWE
            LocalDateTime maxEloDate,    // NOWE
            BigDecimal minElo,           // NOWE
            LocalDateTime minEloDate     // NOWE
    ) {
    }

    public record EloChartLine(String alias, List<EloPoint> history) {
    }

    public record EloPoint(LocalDateTime date, BigDecimal elo) {
    }

    public record Relation(
            String opponentOrPartnerAlias,
            int matches,
            int wins,
            int draws,   // NOWE
            int losses,  // NOWE
            int goalsScoredForTeam,
            int goalsLostForTeam
    ) {
    }

    // Zastąp odpowiednie linijki na samym dole pliku StatsDto.java:
    public record FavoriteTeam(String teamName, Integer assetId, int matches, int wins, int goalsScored, int goalsConceded) {}
    public record PlayerRelations(String playerId, String alias, List<Relation> playedWith,
                                  List<Relation> playedAgainst, List<FavoriteTeam> favoriteTeams) {
    } // ZAKTUALIZOWANE
}