package pl.backend.spodek.rating.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pl.backend.spodek.model.Match;
import pl.backend.spodek.model.PlayerRatingHistory;
import pl.backend.spodek.rating.config.RatingProperties;
import pl.backend.spodek.rating.model.enums.RatingMode;
import pl.backend.spodek.rating.model.request.GamePlayerData;
import pl.backend.spodek.rating.model.request.GameTeamData;
import pl.backend.spodek.rating.model.request.RatingRequest;
import pl.backend.spodek.rating.model.response.RatingResponse;
import pl.backend.spodek.repository.MatchRepository;
import pl.backend.spodek.repository.PlayerRatingHistoryRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RatingHistoryService {

    private final PlayerRatingHistoryRepository historyRepository;
    private final MatchRepository matchRepository;
    private final RatingService ratingService;
    private final RatingProperties ratingProperties; // Wstrzyknięta konfiguracja

    // Pobiera aktualny rating gracza lub domyślny z konfiguracji
    public BigDecimal getLatestRatingForPlayer(String leagueId, String playerId) {
        return historyRepository.findFirstByLeagueIdAndPlayerIdOrderByCreatedAtDesc(leagueId, playerId)
                .map(PlayerRatingHistory::getRatingAfter)
                .orElse(ratingProperties.getDefaultStartRating());
    }

    public void applyMatchRating(Match match) {
        RatingRequest request = buildRatingRequest(match);
        RatingResponse response = ratingService.calculateRating(request);
        saveHistoryRecords(match, response);
    }

    // EFEKT DOMINA (Przeliczanie)
    public void recalculateHistoryFromMatch(String leagueId, LocalDateTime changeTime) {
        log.info("🔄 Uruchamiam przeliczanie wsteczne rankingu dla sezonu {} od czasu: {}", leagueId, changeTime);

        historyRepository.deleteByLeagueIdAndCreatedAtGreaterThanEqual(leagueId, changeTime);

        List<Match> matchesToRecalculate = matchRepository
                .findByLeagueIdAndFinishedAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(leagueId, true, changeTime);

        for (Match match : matchesToRecalculate) {
            applyMatchRating(match);
        }
    }

    // MAPOWANIE MECZU NA REQUEST ELO
    private RatingRequest buildRatingRequest(Match match) {
        return RatingRequest.builder()
                .teamA(mapToTeamData(match.getHomeSide(), match.getLeagueId()))
                .teamB(mapToTeamData(match.getAwaySide(), match.getLeagueId()))
                .mode(RatingMode.TEAM.name())
                .matchWeightIndex(ratingProperties.getMatchWeightIndexDefault())
                .build();
    }

    // MAPOWANIE MATCH-SIDE NA GAME-TEAM-DATA
    private GameTeamData mapToTeamData(Match.MatchSide side, String leagueId) {
        // Z modelu MatchSide pobieramy statystyki graczy i tworzymy modele dla algorytmu ratingowego
        List<GamePlayerData> playersData = side.getPlayers().stream()
                .map(playerStats -> GamePlayerData.builder()
                        .id(playerStats.getPlayerId()) // Bierzemy playerId z PlayerStats
                        .rating(getLatestRatingForPlayer(leagueId, playerStats.getPlayerId())) // Aktualny rating na
                        // dany moment
                        .build())
                .toList();

        return GameTeamData.builder()
                .goals(side.getGoals()) // Pobieramy gole przypisane do drużyny
                .players(playersData)
                .build();
    }

    // ZAPIS WYNIKU DO HISTORII
    private void saveHistoryRecords(Match match, RatingResponse response) {
        List<PlayerRatingHistory> historyRecords = response.getPlayers().stream()
                .map(playerData -> PlayerRatingHistory.builder()
                        .playerId(playerData.getId())
                        .matchId(match.getId())
                        .leagueId(match.getLeagueId())
                        // Obliczamy rating sprzed meczu (obecny minus różnica)
                        .ratingBefore(playerData.getRating().subtract(playerData.getRatingDifference()))
                        .ratingAfter(playerData.getRating())
                        .ratingDifference(playerData.getRatingDifference())
                        .build())
                .toList();

        historyRepository.saveAll(historyRecords);
    }

    public void enrichMatchWithLiveRating(Match match) {
        // 1. Budujemy request tak samo jak przy zapisie, używając aktualnych goli
        RatingRequest request = buildRatingRequest(match);

        // 2. Liczymy rating (bez zapisu do historii!)
        RatingResponse response = ratingService.calculateRating(request);

        // 3. Wrzucamy wyniki symulacji do przejściowych pól w meczu
        updateSideWithLiveRatings(match.getHomeSide(), response);
        updateSideWithLiveRatings(match.getAwaySide(), response);
    }

    private void updateSideWithLiveRatings(Match.MatchSide side, RatingResponse response) {
        if (side == null || side.getPlayers() == null) return;

        side.getPlayers().forEach(playerStats -> {
            // Szukamy wyniku dla danego gracza w odpowiedzi z RatingService
            response.getPlayers().stream()
                    .filter(p -> p.getId().equals(playerStats.getPlayerId()))
                    .findFirst()
                    .ifPresent(ratingData -> {
                        playerStats.setLiveRating(ratingData.getRating());
                        playerStats.setLiveRatingDifference(ratingData.getRatingDifference());
                    });
        });
    }
}