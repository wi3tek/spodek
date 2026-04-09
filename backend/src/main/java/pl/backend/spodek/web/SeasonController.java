package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.backend.spodek.dto.SeasonTableEntryDTO;
import pl.backend.spodek.model.Season;
import pl.backend.spodek.repository.SeasonRepository;
import pl.backend.spodek.service.SeasonService;

import java.util.List;

@RequestMapping("/api/seasons")
@RestController
@RequiredArgsConstructor
public class SeasonController {

    private final SeasonRepository seasonRepository;
    private final SeasonService seasonService;

    @GetMapping("/league/{leagueId}")
    public List<Season> getSeasonsByLeague(@PathVariable String leagueId) {
        // Zwracamy sezony od najnowszego (audyt nam w tym pomaga)
        return seasonRepository.findByLeagueId( leagueId );
    }

    @PostMapping
    public Season createSeason(@RequestBody Season season) {
        if (season.getStatus() == null) season.setStatus( "ACTIVE" );
        return seasonRepository.save( season );
    }

    @PutMapping("/{id}")
    public Season updatePlayer(@PathVariable String id, @RequestBody Season season) {
        return seasonRepository.findById( id )
                .map( existing -> {
                    existing.setName( season.getName() );
                    return seasonRepository.save( existing );
                } )
                .orElseThrow( () -> new RuntimeException( "Nie ma takiego sezonu" ) );
    }

    @GetMapping("/{seasonId}")
    public Season getSeasonsById(@PathVariable String seasonId) {
        // Zwracamy sezony od najnowszego (audyt nam w tym pomaga)
        return seasonRepository.findById( seasonId ).orElseThrow(() -> new IllegalArgumentException("There is no " +
                "season with id: "+seasonId));
    }

    @GetMapping("/{seasonId}/table")
    public ResponseEntity<List<SeasonTableEntryDTO>> getSeasonTable(@PathVariable String seasonId) {
        // Wywołujemy logikę przeliczania w locie, którą napisaliśmy wcześniej
        return ResponseEntity.ok(seasonService.getSeasonTable(seasonId));
    }
}
