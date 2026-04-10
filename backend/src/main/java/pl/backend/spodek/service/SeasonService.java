package pl.backend.spodek.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.backend.spodek.dto.SeasonTableEntryDTO;
import pl.backend.spodek.model.Match;
import pl.backend.spodek.model.Player;
import pl.backend.spodek.repository.MatchRepository;

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
        // Zakładam, że pobierasz tylko zakończone, jeśli nie - dodaj filtrację
        List<Match> matches = matchRepository.findBySeasonId(seasonId);
        Map<String, Player> playersMap = adminService.getPlayersMap();

        Map<String, SeasonTableEntryDTO> statsMap = new HashMap<>();

        for (Match match : matches) {
            processMatchSide(statsMap, match, true, playersMap);  // Gospodarze
            processMatchSide(statsMap, match, false, playersMap); // Goście
        }

        // 3. Konwersja na listę i finalne sortowanie
        return statsMap.values().stream()
                .peek(entry -> {
                    // Wyliczamy różnicę bramek (Indywidualne strzelone - Drużynowe stracone)
                    entry.setGoalDifference(entry.getGoalsScored() - entry.getGoalsLost());
                })
                .sorted(Comparator.comparing(SeasonTableEntryDTO::getWinRatio)
                        .thenComparingInt(SeasonTableEntryDTO::getPoints)
                        .thenComparingInt(SeasonTableEntryDTO::getGoalDifference)
                        .thenComparingInt(SeasonTableEntryDTO::getGoalsScored)
                        .reversed())
                .collect(Collectors.toList());
    }

    private void processMatchSide(
            Map<String, SeasonTableEntryDTO> statsMap,
            Match match,
            boolean isHome,
            Map<String, Player> playersMap
    ) {
        var currentSide = isHome ? match.getHomeSide() : match.getAwaySide();
        var opponentSide = isHome ? match.getAwaySide() : match.getHomeSide();

        // Wyznaczanie punktów dla drużyny w tym meczu
        int points = 0;
        int win = 0, draw = 0, loss = 0;

        if (currentSide.getGoals() > opponentSide.getGoals()) {
            points = 3; win = 1;
        } else if (currentSide.getGoals() == opponentSide.getGoals()) {
            points = 1; draw = 1;
        } else {
            loss = 1;
        }

        for (var player : currentSide.getPlayers()) {
            String pId = player.getPlayerId();

            statsMap.computeIfAbsent(pId, id -> {
                SeasonTableEntryDTO dto = new SeasonTableEntryDTO();
                dto.setPlayerId(id);
                Player p = playersMap.get(id);
                dto.setAlias(p != null ? p.getAlias() : "Nieznany");
                dto.setWinRatio(BigDecimal.ZERO);
                return dto;
            });

            SeasonTableEntryDTO s = statsMap.get(pId);

            // KUMULACJA STATYSTYK (używamy += lub set(get() + value))
            s.setMatchesPlayed(s.getMatchesPlayed() + 1);
            s.setPoints(s.getPoints() + points);
            s.setWins(s.getWins() + win);
            s.setDraws(s.getDraws() + draw);
            s.setLosses(s.getLosses() + loss);

            // Gole strzelone TYLKO przez tego gracza (akumulacja)
            s.setGoalsScored(s.getGoalsScored() + player.getGoals());

            // Gole stracone przez DRUŻYNĘ tego gracza (akumulacja)
            s.setGoalsLost(s.getGoalsLost() + currentSide.getGoals());

            // Kartki i asysty (akumulacja)
            s.setYellowCards(s.getYellowCards() + player.getYellowCards());
            s.setRedCards(s.getRedCards() + player.getRedCards());
            s.setAssists(s.getAssists() + player.getAssists());

            // Wyliczanie winRatio na bieżąco (pkt / mecze)
            if (s.getMatchesPlayed() > 0) {
                BigDecimal ratio = BigDecimal.valueOf(s.getPoints())
                        .divide(BigDecimal.valueOf(s.getMatchesPlayed()), 2, RoundingMode.HALF_UP);
                s.setWinRatio(ratio);
            }
        }
    }
}
