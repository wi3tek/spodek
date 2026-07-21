package pl.backend.spodek.service.stats;

import lombok.Builder;
import lombok.Data;
import pl.backend.spodek.model.Match;
import pl.backend.spodek.model.Player;
import pl.backend.spodek.model.PlayerRatingHistory;
import pl.backend.spodek.model.Team;
import pl.backend.spodek.service.stats.model.MatchTracker;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Data
@Builder
public class FunFactInput {

    private Map<String, Map<String, MatchTracker>> playedWith;
    private Map<String, Map<String, MatchTracker>> playedAgainst;
    private Map<String, Integer> yellowCardsMap;
    private Map<String, Integer> redCardsMap;
    private Map<String, Integer> assistsMap;
    private Map<String, Map<String, MatchTracker>> clubPerformanceMap;
    private Map<String, MatchTracker> playerTotalTracker;
    private Map<String, Player> playersMap;
    private Map<String, Team> teamsMap;
    private Set<String> activePlayerIds;
    private Map<String, Integer> goalsMap;
    private List<Match> targetMatches;
    // --- NOWE POLE: Historia ELO z całej ligi ---
    private List<PlayerRatingHistory> ratingHistory;
}
