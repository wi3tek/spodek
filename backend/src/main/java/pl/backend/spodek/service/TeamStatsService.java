package pl.backend.spodek.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.backend.spodek.dto.TeamStatsDto;
import pl.backend.spodek.model.Match;
import pl.backend.spodek.model.Team;
import pl.backend.spodek.repository.MatchRepository;
import pl.backend.spodek.repository.TeamRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamStatsService {

    public static final int LIMIT = 1000;
    private final MatchRepository matchRepository;
    private final TeamRepository teamRepository;
    private static final int MIN_MATCHES = 5; // Minimalna liczba spotkań

    public TeamStatsDto.Response generateTeamStats(String leagueId, String seasonId) {
        Map<String, Team> teamsMap = teamRepository.findAll().stream()
                .collect(Collectors.toMap(Team::getId, t -> t));

        // Mecze z całej ligi - to jedyne czego teraz potrzebujemy
        List<Match> leagueMatches = matchRepository.findByLeagueIdAndFinished(leagueId, true);

        Map<String, TeamTracker> trackerMap = new HashMap<>();

        // Liczymy mecze z całej historii ligi
        for (Match m : leagueMatches) {
            processMatch(m.getHomeSide(), m.getAwaySide(), trackerMap);
            processMatch(m.getAwaySide(), m.getHomeSide(), trackerMap);
        }

        // Tworzymy DTO dla wszystkich drużyn
        List<TeamStatsDto.TeamStatEntry> allTeamsStats = trackerMap.entrySet().stream()
                .filter(e -> {
                    Team team = teamsMap.get(e.getKey());
                    return team != null && team.getName() != null && !team.getName().toLowerCase().contains("nieznan");
                })
                .map(e -> {
                    Team t = teamsMap.get(e.getKey());
                    TeamTracker tr = e.getValue();
                    double wr = tr.matches > 0 ? (double) tr.wins / tr.matches : 0.0;
                    double avgScored = tr.matches > 0 ? (double) tr.goalsFor / tr.matches : 0.0;
                    double avgConceded = tr.matches > 0 ? (double) tr.goalsAgainst / tr.matches : 0.0;
                    return new TeamStatsDto.TeamStatEntry(t.getId(), t.getAlias() != null ? t.getAlias() : t.getName(), t.getAssetId(), tr.matches, tr.wins, tr.draws, tr.losses, wr, avgScored, avgConceded);
                })
                .toList();

        // Filtrujemy tylko te z progiem minimum meczów do rankingów średnich (Win Ratio, Średnia Brmek)

        int matches =
                allTeamsStats.stream().mapToInt( TeamStatsDto.TeamStatEntry::matches ).max().orElse( 0 ) < MIN_MATCHES
                ? 0
                : MIN_MATCHES;

        List<TeamStatsDto.TeamStatEntry> qualified = allTeamsStats.stream()
                .filter(t -> t.matches() >= matches)
                .toList();

        TeamStatsDto.TeamLeaderboards leaderboards = new TeamStatsDto.TeamLeaderboards(
                qualified.stream().sorted(Comparator.comparingDouble(TeamStatsDto.TeamStatEntry::winRatio).reversed()).limit( LIMIT ).toList(),
                qualified.stream().sorted(Comparator.comparingDouble(TeamStatsDto.TeamStatEntry::winRatio)).limit( LIMIT ).toList(),
                qualified.stream().sorted(Comparator.comparingDouble(TeamStatsDto.TeamStatEntry::avgScored).reversed()).limit( LIMIT ).toList(),
                qualified.stream().sorted(Comparator.comparingDouble(TeamStatsDto.TeamStatEntry::avgConceded).reversed()).limit( LIMIT ).toList(),
                qualified.stream().sorted(Comparator.comparingDouble(TeamStatsDto.TeamStatEntry::avgConceded)).limit( LIMIT ).toList(),
                qualified.stream().sorted(Comparator.comparingInt(TeamStatsDto.TeamStatEntry::draws).reversed()).limit( LIMIT ).toList(),
                allTeamsStats.stream().sorted(Comparator.comparingInt(TeamStatsDto.TeamStatEntry::matches).reversed()).limit( LIMIT ).toList() // Tutaj lądują wszystkie zespoły - kto grał najczęściej
        );

        // Punkty na mapę
        List<TeamStatsDto.TeamMapPoint> mapPoints = allTeamsStats.stream()
                .map(stat -> teamsMap.get(stat.teamId()))
                .filter(t -> t != null && t.getLatitude() != null && t.getLongitude() != null)
                .map(t -> new TeamStatsDto.TeamMapPoint(t.getId(), t.getAlias() != null ? t.getAlias() : t.getName(), t.getAssetId(), t.getLatitude(), t.getLongitude()))
                .toList();

        return new TeamStatsDto.Response(leaderboards, mapPoints);
    }

    private void processMatch(Match.MatchSide side, Match.MatchSide oppSide, Map<String, TeamTracker> map) {
        if (side == null || side.getTeamId() == null) return;
        boolean win = side.getGoals() > oppSide.getGoals();
        boolean draw = side.getGoals() == oppSide.getGoals();

        map.computeIfAbsent(side.getTeamId(), k -> new TeamTracker())
                .addMatch(win, draw, side.getGoals(), oppSide.getGoals());
    }

    private static class TeamTracker {
        int matches = 0; int wins = 0; int draws = 0; int losses = 0;
        int goalsFor = 0; int goalsAgainst = 0;

        void addMatch(boolean isWin, boolean isDraw, int gf, int ga) {
            this.matches++;
            this.goalsFor += gf;
            this.goalsAgainst += ga;
            if (isWin) this.wins++;
            else if (isDraw) this.draws++;
            else this.losses++;
        }
    }
}