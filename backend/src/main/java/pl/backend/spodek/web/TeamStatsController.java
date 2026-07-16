package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.backend.spodek.dto.TeamStatsDto;
import pl.backend.spodek.service.TeamStatsService;

@RestController
@RequestMapping("/api/team-stats")
@RequiredArgsConstructor
public class TeamStatsController {

    private final TeamStatsService teamStatsService;

    @GetMapping("/{leagueId}")
    public ResponseEntity<TeamStatsDto.Response> getTeamStats(
            @PathVariable String leagueId,
            @RequestParam String seasonId
    ) {
        return ResponseEntity.ok(teamStatsService.generateTeamStats(leagueId, seasonId));
    }
}