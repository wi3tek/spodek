package pl.backend.spodek.web;


import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import pl.backend.spodek.model.League;
import pl.backend.spodek.repository.LeagueRepository;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/leagues")
@RequiredArgsConstructor
public class LeagueController {

    private final LeagueRepository leagueRepository;

    @GetMapping
    public List<League> getAllLeagues() {
        return leagueRepository.findAll().stream()
                .sorted( Comparator.comparing( League::getCreatedAt ).reversed() )
                .toList();
    }

    @PostMapping
    public League createLeague(@RequestBody League league) {
        // Domyślny status, jeśli ktoś go nie prześle
        if (league.getStatus() == null) {
            league.setStatus( "ACTIVE" );
        }
        // Save automatycznie uzupełni createdAt, updatedAt, createdBy itp.
        return leagueRepository.save( league );
    }

    @GetMapping("/{leagueId}")
    public League getLeagueById(
            @PathVariable String leagueId
    ) {
        return leagueRepository.findById( leagueId ).orElseThrow( () -> new IllegalArgumentException( "League with id " +
                "%s not found".formatted( leagueId ) ) );
    }
}