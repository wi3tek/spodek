package pl.backend.spodek.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import pl.backend.spodek.dto.SeasonTableEntryDTO;
import pl.backend.spodek.model.Match;
import pl.backend.spodek.model.Player;
import pl.backend.spodek.model.PlayerRatingHistory;
import pl.backend.spodek.model.Season;
import pl.backend.spodek.repository.LeagueIdProjection;
import pl.backend.spodek.repository.MatchRepository;
import pl.backend.spodek.repository.PlayerRatingHistoryRepository;
import pl.backend.spodek.repository.SeasonRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeasonService {

    private final MatchRepository matchRepository;
    private final AdminService adminService;
    private final SeasonRepository seasonRepository;
    // NOWE: Wstrzykujemy repozytorium historii ratingów
    private final PlayerRatingHistoryRepository ratingHistoryRepository;

    public List<SeasonTableEntryDTO> getSeasonTable(String seasonId) {
        List<Match> matches = matchRepository.findBySeasonId( seasonId );
        Map<String, Player> playersMap = adminService.getPlayersMap();

        // Zabezpieczenie: jeśli nie ma meczów, nie ma tabeli
        if (matches.isEmpty()) {
            return Collections.emptyList();
        }
// TODO poprawic w matches leagueId
        String leagueId = matches.getFirst().getLeagueId();

        // Wyciągamy datę ostatniego meczu w tym sezonie, żeby wiedzieć dla jakiego momentu pobrać "Snapshot" ELO
        LocalDateTime lastMatchDate = matches.stream()
                .map(Match::getCreatedAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(LocalDateTime.now());

        Map<String, SeasonTableEntryDTO> statsMap = new HashMap<>();

        for (Match match : matches) {
            processMatchSide( statsMap, match, true, playersMap );
            processMatchSide( statsMap, match, false, playersMap );
        }

        // Pobieramy historię ELO i dopisujemy do zawodników
        for (SeasonTableEntryDTO entry : statsMap.values()) {
            // Tymczasowo (do momentu jak napiszesz dedykowane query w Mongo),
            // pobieramy wszystko i filtrujemy w Javie. W produkcji najlepiej napisać metodę:
            // findFirstByLeagueIdAndPlayerIdAndCreatedAtLessThanEqualOrderByCreatedAtDesc

            // Ponieważ nie znamy Twojego repo w 100%, zrobimy bezpieczne pobranie najnowszego dla tego gracza w tej lidze.
            // Zauważ, że jeśli gracz miał nowsze mecze w innym sezonie, ten kod trzeba zoptymalizować pod datę (lastMatchDate).
            Optional<PlayerRatingHistory> latestRating = ratingHistoryRepository
                    .findFirstByLeagueIdAndPlayerIdOrderByCreatedAtDesc(leagueId, entry.getPlayerId());

            if (latestRating.isPresent()) {
                entry.setCurrentElo(latestRating.get().getRatingAfter());
                entry.setEloDifference(latestRating.get().getRatingDifference());
            } else {
                entry.setCurrentElo(BigDecimal.valueOf(1000)); // Wartość domyślna
                entry.setEloDifference(BigDecimal.ZERO);
            }

            entry.setGoalDifference( entry.getGoalsScored() - entry.getGoalsLost() );
        }

        return statsMap.values().stream()
                .sorted( Comparator.comparing( SeasonTableEntryDTO::getWinRatio )
                        .thenComparingInt( SeasonTableEntryDTO::getPoints )
                        .thenComparingInt( SeasonTableEntryDTO::getGoalDifference )
                        .thenComparingInt( SeasonTableEntryDTO::getGoalsScored )
                        .reversed() )
                .collect( Collectors.toList() );
    }

    private void processMatchSide(
            Map<String, SeasonTableEntryDTO> statsMap,
            Match match,
            boolean isHome,
            Map<String, Player> playersMap
    ) {
        var currentSide = isHome ? match.getHomeSide() : match.getAwaySide();
        var opponentSide = isHome ? match.getAwaySide() : match.getHomeSide();

        int points = 0;
        int win = 0, draw = 0, loss = 0;

        if (currentSide.getGoals() > opponentSide.getGoals()) {
            points = 3;
            win = 1;
        } else if (currentSide.getGoals() == opponentSide.getGoals()) {
            points = 1;
            draw = 1;
        } else {
            loss = 1;
        }

        for (var player : currentSide.getPlayers()) {
            String pId = player.getPlayerId();

            statsMap.computeIfAbsent( pId, id -> {
                SeasonTableEntryDTO dto = new SeasonTableEntryDTO();
                dto.setPlayerId( id );
                Player p = playersMap.get( id );
                dto.setAlias( p != null ? p.getAlias() : "Nieznany" );
                dto.setImageUrl( p.getImageUrl() );
                dto.setWinRatio( BigDecimal.ZERO );
                return dto;
            } );

            SeasonTableEntryDTO s = statsMap.get( pId );

            s.setMatchesPlayed( s.getMatchesPlayed() + 1 );
            s.setPoints( s.getPoints() + points );
            s.setWins( s.getWins() + win );
            s.setDraws( s.getDraws() + draw );
            s.setLosses( s.getLosses() + loss );

            s.setGoalsScored( s.getGoalsScored() + currentSide.getGoals() );
            s.setGoalsLost( s.getGoalsLost() + opponentSide.getGoals() );

            s.setYellowCards( s.getYellowCards() + player.getYellowCards() );
            s.setRedCards( s.getRedCards() + player.getRedCards() );
            s.setAssists( s.getAssists() + player.getAssists() );

            if (s.getMatchesPlayed() > 0) {
                BigDecimal ratio = BigDecimal.valueOf( s.getPoints() )
                        .divide( BigDecimal.valueOf( s.getMatchesPlayed() ), 2, RoundingMode.HALF_UP );
                s.setWinRatio( ratio );
            }
        }
    }

    @Cacheable("leagueIdBySeason")
    public String getLeagueIdBySeason(String seasonId) {
        log.info( "⚠️ [CACHE MISS] Pobieram id ligi dla sezonu: " + seasonId );
        LeagueIdProjection projection = seasonRepository.findLeagueIdById( seasonId );
        return projection != null ? projection.getLeagueId() : null;
    }

    public Season getSeasonById(String seasonId) {
        return seasonRepository.findById( seasonId ).orElseThrow( () -> new IllegalArgumentException( "There is no " +
                "season with id: " + seasonId ) );
    }

    public Season getBySeasonCode(String seasonCode) {

        return seasonRepository.findByLiveCode(seasonCode).orElseThrow(() -> new IllegalArgumentException("Cannot " +
                "find season by code "+ seasonCode));
    }
}