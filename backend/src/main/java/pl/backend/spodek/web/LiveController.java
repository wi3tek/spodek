package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import pl.backend.spodek.dto.LiveResponse;
import pl.backend.spodek.dto.StatsDto;
import pl.backend.spodek.dto.TeamStatsDto;
import pl.backend.spodek.service.LiveService;
import pl.backend.spodek.service.LiveStreamService;
import pl.backend.spodek.service.TeamStatsService;
import pl.backend.spodek.service.stats.StatsService;

@RequestMapping("/api/public")
@RestController
@RequiredArgsConstructor
public class LiveController {

    private final LiveService liveService;
    private final LiveStreamService liveStreamService; // Dodajemy nowy serwis
    private final TeamStatsService teamStatsService;
    private final StatsService statsService;

    // NOWY ENDPOINT STRUMIENIOWY DLA FRONTENDU
    @GetMapping(value = "/live/stream/{seasonCode}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamLiveResults(@PathVariable String seasonCode) {
        return liveStreamService.subscribe(seasonCode);
    }

    // Ten endpoint zostawiamy na wszelki wypadek / awaryjne zapytania
    @GetMapping("/live/{seasonCode}")
    public LiveResponse getSeasonsByLeague(@PathVariable String seasonCode) {
        return liveService.getLiveResults( seasonCode );
    }

    @GetMapping("/team-stats/{leagueId}")
    public ResponseEntity<TeamStatsDto.Response> getTeamStats(
            @PathVariable String leagueId,
            @RequestParam String seasonId
    ) {
        return ResponseEntity.ok(teamStatsService.generateTeamStats(leagueId, seasonId));
    }

    @GetMapping("/stats/{leagueId}")
    public ResponseEntity<StatsDto.Response> getStats(
            @PathVariable String leagueId,
            @RequestParam String seasonId) {
        return ResponseEntity.ok(statsService.generateFullStats(leagueId, seasonId));
    }
}