package pl.backend.spodek.dto;

import java.util.List;

public class TeamStatsDto {

    public record Response(
            TeamLeaderboards leaderboards,
            List<TeamMapPoint> mapPoints
    ) {}

    public record TeamLeaderboards(
            List<TeamStatEntry> highestWinRatio,
            List<TeamStatEntry> lowestWinRatio,
            List<TeamStatEntry> highestAvgScored,
            List<TeamStatEntry> highestAvgConceded,
            List<TeamStatEntry> lowestAvgConceded, // Dodane dla najlepszej defensywy
            List<TeamStatEntry> mostDraws,
            List<TeamStatEntry> mostPlayed
    ) {}

    public record TeamStatEntry(
            String teamId,
            String alias,
            Integer assetId,
            int matches,
            int wins,
            int draws,
            int losses,
            double winRatio,
            double avgScored,
            double avgConceded
    ) {}

    public record TeamMapPoint(
            String teamId,
            String alias,
            Integer assetId,
            Double lat,
            Double lng
    ) {}
}