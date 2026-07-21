package pl.backend.spodek.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.security.SecureRandom;
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
    private final PlayerRatingHistoryRepository ratingHistoryRepository;

    private static final String ALPHANUMERIC = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private final SecureRandom secureRandom = new SecureRandom();

    public Season createSeason(Season season) {
        if (season.getStatus() == null) {
            season.setStatus( "ACTIVE" );
        }

        season.setStartDate( LocalDateTime.now() );
        season.setLiveCode( generateUniqueLiveCode() );

        return seasonRepository.save( season );
    }

    public List<SeasonTableEntryDTO> getSeasonTable(String seasonId) {
        // Musimy posortować mecze chronologicznie, żeby historia punktów składała się poprawnie!
        List<Match> matches = matchRepository.findBySeasonId( seasonId ).stream()
                .sorted(Comparator.comparing(Match::getCreatedAt))
                .toList();
        Map<String, Player> playersMap = adminService.getPlayersMap();

        if (matches.isEmpty()) {
            return Collections.emptyList();
        }

        String leagueId = matches.get(0).getLeagueId();

        // 1. Pobieramy pełną historię ELO dla ligi i mapujemy: matchId -> (playerId -> ratingAfter)
        List<PlayerRatingHistory> eloHist = ratingHistoryRepository.findByLeagueIdOrderByCreatedAtAsc(leagueId);
        Map<String, Map<String, BigDecimal>> eloByMatch = new HashMap<>();
        for (PlayerRatingHistory rh : eloHist) {
            if (rh.getMatchId() != null) {
                eloByMatch.computeIfAbsent(rh.getMatchId(), k -> new HashMap<>())
                        .put(rh.getPlayerId(), rh.getRatingAfter());
            }
        }

        // Przechowuje nam "obecne" ELO gracza podczas pętli
        Map<String, BigDecimal> currentEloMap = new HashMap<>();
        Map<String, SeasonTableEntryDTO> statsMap = new HashMap<>();

        int globalMatchIndex = 0; // <--- INICJALIZACJA
        for (Match match : matches) {
            globalMatchIndex++;
            processMatchSide( statsMap, match, true, playersMap, eloByMatch, currentEloMap, globalMatchIndex );
            processMatchSide( statsMap, match, false, playersMap, eloByMatch, currentEloMap, globalMatchIndex );
        }

        // Dopisywanie wartości ostatecznych i różnicy ELO z ostatniego meczu
        for (SeasonTableEntryDTO entry : statsMap.values()) {
            Optional<PlayerRatingHistory> latestRating = ratingHistoryRepository
                    .findFirstByLeagueIdAndPlayerIdOrderByCreatedAtDesc( leagueId, entry.getPlayerId() );

            if (latestRating.isPresent()) {
                entry.setCurrentElo( latestRating.get().getRatingAfter() );
                entry.setEloDifference( latestRating.get().getRatingDifference() );
            } else {
                entry.setCurrentElo( BigDecimal.valueOf( 1000 ) );
                entry.setEloDifference( BigDecimal.ZERO );
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
            Map<String, Player> playersMap,
            Map<String, Map<String, BigDecimal>> eloByMatch,
            Map<String, BigDecimal> currentEloMap,
            int globalMatchIndex
    ) {
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

            BigDecimal eloAfter = currentEloMap.getOrDefault(pId, BigDecimal.valueOf(1000));
            if (eloByMatch.containsKey(match.getId()) && eloByMatch.get(match.getId()).containsKey(pId)) {
                eloAfter = eloByMatch.get(match.getId()).get(pId);
                currentEloMap.put(pId, eloAfter);
            }

            // UWAGA: Nie usuwamy już historii z danej kolejki (jak sugerowałem wcześniej),
            // ponieważ potrzebujemy precyzyjnych danych do trybu "Mecz po meczu".
            // Frontend sam wybierze ostatni mecz z kolejki w trybie "Po każdej Kolejce".

            SeasonTableEntryDTO.PlayerMatchSnapshot snap = new SeasonTableEntryDTO.PlayerMatchSnapshot(
                    match.getMatchweek(),
                    globalMatchIndex,
                    s.getPoints(),
                    s.getWinRatio(),
                    eloAfter
            );
            s.getHistory().add(snap);
        }
    }

    // 1. POPRAWIONY KLUCZ: #seasonId
   // @Cacheable(value = "leagueIdBySeason", key = "#seasonId")
    public String getLeagueIdBySeason(String seasonId) {
        log.info( "⚠️ [CACHE MISS] Pobieram id ligi dla sezonu: " + seasonId );
        LeagueIdProjection projection = seasonRepository.findLeagueIdById( seasonId );
        return projection != null ? projection.getLeagueId() : null;
    }

    // 2. LEPSZA NAZWA CACHE: seasonById
  //  @Cacheable(value = "seasonById", key = "#seasonId")
    public Season getSeasonById(String seasonId) {
        return findBySeasonId( seasonId ).orElseThrow( () -> new IllegalArgumentException( "There is no " +
                "season with id: " + seasonId ) );
    }

    private Optional<Season> findBySeasonId(String seasonId) {
        return seasonRepository.findById( seasonId );
    }

    // 3. LEPSZA NAZWA CACHE: seasonByCode
  //  @Cacheable(value = "seasonByCode", key = "#seasonCode")
    public Season getBySeasonCode(String seasonCode) {
        return seasonRepository.findByLiveCode( seasonCode ).orElseThrow( () -> new IllegalArgumentException( "Cannot " +
                "find season by code " + seasonCode ) );
    }

    public Optional<String> findSeasonCodeBySeasonId(String seasonId) {
        return findBySeasonId( seasonId ).map( Season::getLiveCode );
    }

    // Metoda pomocnicza
    public String generateUniqueLiveCode() {
        while (true) {
            // 1. Generujemy nowy kod
            StringBuilder sb = new StringBuilder( 8 );
            for (int i = 0; i < 8; i++) {
                sb.append( ALPHANUMERIC.charAt( secureRandom.nextInt( ALPHANUMERIC.length() ) ) );
            }
            String code = sb.toString();

            // 2. Sprawdzamy, czy taki kod już istnieje w bazie
            boolean codeExists = seasonRepository.findByLiveCode( code ).isPresent();

            // 3. Jeśli NIE znalazł sezonu po danym kodzie, możemy go użyć i przerwać pętlę
            if (!codeExists) {
                return code;
            }

            // 4. Jeśli znalazł (codeExists == true), pętla ignoruje "if"
            // i zaczyna się od nowa, generując kolejny kod.
        }
    }
}
