package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.backend.spodek.model.Matchweek;
import pl.backend.spodek.service.MatchweekService;

import java.util.List;

@RestController
@RequestMapping("/api/matchweeks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MatchweekController {

    private final MatchweekService matchweekService;

    @GetMapping("/{seasonId}/{matchweek}")
    public ResponseEntity<Matchweek> getMatchweek(@PathVariable String seasonId, @PathVariable int matchweek) {
        return ResponseEntity.ok(matchweekService.getOrCreateMatchweek(seasonId, matchweek));
    }

    @PutMapping("/{seasonId}/{matchweek}/attendance")
    public ResponseEntity<Matchweek> updateAttendance(
            @PathVariable String seasonId,
            @PathVariable int matchweek,
            @RequestBody List<String> presentPlayerIds) {

        Matchweek updated = matchweekService.updateAttendance(seasonId, matchweek, presentPlayerIds);
        return ResponseEntity.ok(updated);
    }
}