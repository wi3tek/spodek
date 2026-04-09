package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.backend.spodek.dto.MatchDTO;
import pl.backend.spodek.model.Match;
import pl.backend.spodek.repository.MatchRepository;
import pl.backend.spodek.service.MatchService;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // W produkcji zamień na konkretny adres Twojego Angulara
public class MatchController {

    private final MatchService matchService;
    private final MatchRepository matchRepository;

    // POBIERANIE MECZÓW DLA SEZONU (Zoptymalizowane DTO z keszem)
    @GetMapping("/season/{seasonId}")
    public ResponseEntity<List<MatchDTO>> getMatchesBySeason(@PathVariable String seasonId) {
        log.info("🚀 Żądanie pobrania meczów dla sezonu: {}", seasonId);
        List<MatchDTO> matches = matchService.getMatchesBySeason(seasonId);
        return ResponseEntity.ok(matches);
    }

    // DODAWANIE NOWEGO MECZU
    @PostMapping
    public ResponseEntity<Match> createMatch(@RequestBody Match match) {
        log.info("⚽ Zapisuję nowy mecz w kolejce: {}", match.getMatchweek());
        // Zapisujemy surowy dokument do bazy
        Match savedMatch = matchService.createMatch(match);
        return ResponseEntity.ok(savedMatch);
    }

    // AKTUALIZACJA MECZU (Np. zmiana wyniku lub statystyk graczy)
    @PutMapping("/{id}")
    public ResponseEntity<Match> updateMatch(@PathVariable String id, @RequestBody Match matchDetails) {
        log.info("✏️ Próba aktualizacji meczu o ID: {}", id);

        return ResponseEntity.ok(matchService.updateMatch( id, matchDetails ));
    }

    // USUWANIE MECZU
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMatch(@PathVariable String id) {
        log.warn("🗑️ Usuwanie meczu o ID: {}", id);
        if (matchRepository.existsById(id)) {
            matchRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}