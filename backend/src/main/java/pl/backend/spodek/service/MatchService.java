package pl.backend.spodek.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pl.backend.spodek.dto.MatchDTO;
import pl.backend.spodek.model.Match;
import pl.backend.spodek.model.Player;
import pl.backend.spodek.model.Team;
import pl.backend.spodek.repository.MatchRepository;
import pl.backend.spodek.repository.PlayerRepository;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchService {

    private final MatchRepository matchRepository;
    private final AdminService adminService; // Wstrzykujemy AdminService zamiast repozytoriów
    private final PlayerRepository playerRepository;


    public Match createMatch(Match dto) {
        // currentMatchId to null, bo mecz jeszcze nie istnieje
        validatePlayersAvailability( dto, null );

        return matchRepository.save( dto );
    }

    public Match updateMatch(String matchId, Match matchDetails) {
        // Podajemy matchId, żeby system wiedział, by zignorować ten konkretny mecz w walidacji
        validatePlayersAvailability( matchDetails, matchId );

        Match existingMatch = matchRepository.findById( matchId ).orElseThrow();

        if (existingMatch.isFinished()) {
            log.warn( "🚫 Odmowa edycji: Mecz {} jest już zakończony!", matchId );
            throw new IllegalArgumentException( "Nie można edytować zakończonego meczu." );
        }

        // Aktualizujemy dane
        existingMatch.setMatchweek( matchDetails.getMatchweek() );
        existingMatch.setHomeSide( matchDetails.getHomeSide() );
        existingMatch.setAwaySide( matchDetails.getAwaySide() );
        existingMatch.setFinished( matchDetails.isFinished() );

        // Pozwalamy zmienić status na finished w tej edycji (zamknięcie meczu)
        existingMatch.setFinished( matchDetails.isFinished() );

        return matchRepository.save( existingMatch );
    }

    public List<MatchDTO> getMatchesBySeason(String seasonId) {
        List<Match> matches = matchRepository.findBySeasonIdOrderByCreatedAtDesc( seasonId );

        // Pobieramy keszowane mapy
        Map<String, Team> teamMap = adminService.getTeamsMap();
        Map<String, Player> playerMap = adminService.getPlayersMap();

        return matches.stream().map( m -> mapToDTO( m, teamMap, playerMap ) ).toList();
    }

    private MatchDTO mapToDTO(Match m, Map<String, Team> teamMap, Map<String, Player> playerMap) {
        MatchDTO dto = new MatchDTO();
        dto.setId( m.getId() );
        dto.setSeasonId( m.getSeasonId() );
        dto.setMatchweek( m.getMatchweek() );
        dto.setCreatedAt( m.getCreatedAt() );
        dto.setUpdatedAt( m.getUpdatedAt() ); // Mapowanie nowego pola
        dto.setFinished( m.isFinished() );

        dto.setHomeSide( mapSide( m.getHomeSide(), teamMap, playerMap ) );
        dto.setAwaySide( mapSide( m.getAwaySide(), teamMap, playerMap ) );

        return dto;
    }

    private MatchDTO.SideDTO mapSide(Match.MatchSide side, Map<String, Team> teamMap, Map<String, Player> playerMap) {
        MatchDTO.SideDTO sideDto = new MatchDTO.SideDTO();
        Team team = teamMap.get( side.getTeamId() );

        sideDto.setTeamName( team != null ? (team.getAlias() != null ? team.getAlias() : team.getName()) : "Unknown" );
        sideDto.setAssetId( team != null ? team.getAssetId().toString() : null );
        sideDto.setTeamId( team != null ? team.getId().toString() : null );
        sideDto.setGoals( side.getGoals() );
        sideDto.setPlayers( side.getPlayers().stream().map( p -> {
            MatchDTO.PlayerInfoDTO pDto = new MatchDTO.PlayerInfoDTO();
            Player player = playerMap.get( p.getPlayerId() );
            pDto.setPlayerId( player.getId() );
            pDto.setAlias( player != null ? player.getAlias() : "Anonim" );
            pDto.setGoals( p.getGoals() );       // MAPOWANIE BRAMEK
            pDto.setAssists( p.getAssists() );   // MAPOWANIE ASYST
            pDto.setYellowCards( p.getYellowCards() );
            pDto.setRedCards( p.getRedCards() );
            return pDto;
        } ).toList() );

        return sideDto;
    }

    private void validatePlayersAvailability(Match newMatch, String currentMatchId) {
        // 1. Zbieramy ID wszystkich graczy z formularza (z encji Match)
        Set<String> incomingPlayers = new HashSet<>();

        if (newMatch.getHomeSide() != null && newMatch.getHomeSide().getPlayers() != null) {
            newMatch.getHomeSide().getPlayers().forEach( p -> incomingPlayers.add( p.getPlayerId() ) );
        }
        if (newMatch.getAwaySide() != null && newMatch.getAwaySide().getPlayers() != null) {
            newMatch.getAwaySide().getPlayers().forEach( p -> incomingPlayers.add( p.getPlayerId() ) );
        }

        // Jeśli nie wybrano jeszcze graczy, przepuszczamy
        if (incomingPlayers.isEmpty()) return;

        // 2. Pobieramy wszystkie trwające mecze w danym sezonie
        List<Match> activeMatches = matchRepository.findBySeasonIdAndFinished( newMatch.getSeasonId(), false );

        // 3. Sprawdzamy każdy trwający mecz
        for (Match activeMatch : activeMatches) {

            // POMIJAJ TEN SAM MECZ (przy edycji)
            if (currentMatchId != null && activeMatch.getId().equals( currentMatchId )) {
                continue;
            }

            // Zbieramy graczy z aktywnego meczu z bazy
            List<String> activePlayerIds = new ArrayList<>();
            if (activeMatch.getHomeSide() != null && activeMatch.getHomeSide().getPlayers() != null) {
                activeMatch.getHomeSide().getPlayers().forEach( p -> activePlayerIds.add( p.getPlayerId() ) );
            }
            if (activeMatch.getAwaySide() != null && activeMatch.getAwaySide().getPlayers() != null) {
                activeMatch.getAwaySide().getPlayers().forEach( p -> activePlayerIds.add( p.getPlayerId() ) );
            }

            // 4. Szukamy kolizji (czy ktoś z formularza już gra w activeMatch)
            for (String activePlayerId : activePlayerIds) {
                if (incomingPlayers.contains( activePlayerId )) {
                    // Żeby komunikat był ładniejszy, możemy wyciągnąć alias z newMatch
                    String alias = getPlayerAliasFromMatch( newMatch, activePlayerId );
                    throw new IllegalArgumentException( "Gracz " + alias + " aktualnie gra w innym trwającym meczu!" );
                }
            }
        }
    }

    // Mała metoda pomocnicza, żeby ładnie wyświetlić ksywkę gracza w alercie
    private String getPlayerAliasFromMatch(Match match, String playerId) {
        if (match.getHomeSide() != null) {
            for (var p : match.getHomeSide().getPlayers()) {
                if (p.getPlayerId().equals( playerId ))
                    return playerRepository.findById( playerId ).map( Player::getAlias ).orElseThrow( () -> new IllegalArgumentException( "Player not found, id: " + playerId ) );
            }
        }
        if (match.getAwaySide() != null) {
            for (var p : match.getAwaySide().getPlayers()) {
                if (p.getPlayerId().equals( playerId ))
                    return playerRepository.findById( playerId ).map( Player::getAlias ).orElseThrow( () -> new IllegalArgumentException( "Player not found, id: " + playerId ) );
            }
        }
        return "o podanym ID";
    }
}