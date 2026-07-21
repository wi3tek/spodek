package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.backend.spodek.dto.StatsDto;
import pl.backend.spodek.service.stats.StatsService;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final StatsService statsService;

    @GetMapping("/{leagueId}")
    public ResponseEntity<StatsDto.Response> getStats(
            @PathVariable String leagueId,
            @RequestParam String seasonId,
            @RequestParam(defaultValue = "SEASON") String scope
    ) { // Pobieramy seasonId z frontendu
        return ResponseEntity.ok(statsService.generateFullStats(leagueId, seasonId,scope));
    }
}