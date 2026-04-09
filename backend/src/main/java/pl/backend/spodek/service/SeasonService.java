package pl.backend.spodek.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.backend.spodek.dto.SeasonTableEntryDTO;
import pl.backend.spodek.model.Match;
import pl.backend.spodek.model.Player;
import pl.backend.spodek.repository.MatchRepository;
import pl.backend.spodek.repository.PlayerRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SeasonService {

    private final MatchRepository matchRepository;
    private final AdminService adminService;


    public List<SeasonTableEntryDTO> getSeasonTable(String seasonId) {
        // 1. Pobierz wszystkie ZAKOŃCZONE mecze z tego sezonu
        List<Match> matches = matchRepository.findBySeasonId(seasonId);
        Map<String, Player> playersMap = adminService.getPlayersMap();
        // 2. Mapa do zbierania statystyk (Klucz: playerId)
        Map<String, SeasonTableEntryDTO> statsMap = new HashMap<>();

        for (Match match : matches) {
            processMatchSide(statsMap, match, true,playersMap);  // Procesuj gospodarzy
            processMatchSide(statsMap, match, false,playersMap); // Procesuj gości
        }

        // 3. Konwersja mapy na listę, obliczenie ratio i sortowanie
        List<SeasonTableEntryDTO> collect = statsMap.values().stream()
                .peek( entry -> {
                    entry.setGoalDifference( entry.getGoalsScored() - entry.getGoalsLost() );
//                    entry.setWinRatio( entry.getMatchesPlayed() > 0
//                            ? (double) entry.getWins() / entry.getMatchesPlayed()
//                            : 0.0 );
                } )
                .sorted( Comparator.comparing( SeasonTableEntryDTO::getWinRatio )
                        .thenComparingInt( SeasonTableEntryDTO::getPoints )
                        .thenComparingInt( SeasonTableEntryDTO::getGoalDifference )
                        .thenComparingInt( SeasonTableEntryDTO::getGoalsScored )
                        .reversed() ) // Najlepsi na górę
                .collect( Collectors.toList() );
        return collect;
    }

    private void processMatchSide(Map<String, SeasonTableEntryDTO> statsMap, Match match, boolean isHome,
                                  Map<String, Player> playersMap) {
        var currentSide = isHome ? match.getHomeSide() : match.getAwaySide();
        var opponentSide = isHome ? match.getAwaySide() : match.getHomeSide();

        int points = 0;
        int win = 0, draw = 0, loss = 0;

        if (currentSide.getGoals() > opponentSide.getGoals()) {
            points = 3; win = 1;
        } else if (currentSide.getGoals() == opponentSide.getGoals()) {
            points = 1; draw = 1;
        } else {
            loss = 1;
        }

        final int fPoints = points, fWin = win, fDraw = draw, fLoss = loss;

        for (var player : currentSide.getPlayers()) {
            statsMap.computeIfAbsent(player.getPlayerId(), id -> {
                SeasonTableEntryDTO dto = new SeasonTableEntryDTO();
                dto.setPlayerId(id);
                dto.setAlias(playersMap.get( player.getPlayerId() ).getAlias());
                return dto;
            });

            SeasonTableEntryDTO s = statsMap.get(player.getPlayerId());
            s.setMatchesPlayed(s.getMatchesPlayed() + 1);
            s.setPoints(s.getPoints() + fPoints);
            s.setWins(s.getWins() + fWin);
            s.setDraws(s.getDraws() + fDraw);
            s.setLosses(s.getLosses() + fLoss);
            s.setGoalsScored(s.getGoalsScored() + currentSide.getGoals());
            s.setGoalsLost(s.getGoalsLost() + opponentSide.getGoals());
            s.setWinRatio( BigDecimal.valueOf(s.getPoints()).divide(  BigDecimal.valueOf(   s.getMatchesPlayed()) ,
                    RoundingMode.HALF_UP ));
        }
    }
}
