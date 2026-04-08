package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;
import pl.backend.spodek.model.Team;
import pl.backend.spodek.repository.TeamRepository;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {
    private final TeamRepository teamRepository;

    @GetMapping
    public List<Team> getAllTeams() {
        // Sortujemy po overallRating (DESC - od największego)
        return teamRepository.findAll( Sort.by( Sort.Direction.DESC, "overallRating" ));
    }

    @PutMapping("/{id}")
    public Team updateTeam(@PathVariable String id, @RequestBody Team team) {
        return teamRepository.findById(id)
                .map(existing -> {
                    existing.setAlias(team.getAlias());
                    existing.setName(team.getName()); // Na wszelki wypadek
                    return teamRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Drużyna nie istnieje"));
    }

    @PostMapping("/import")
    public void importTeams(@RequestBody List<Team> teams) {
        teams.forEach(t -> {
            teamRepository.findByAssetId(t.getAssetId()).ifPresentOrElse(
                    existing -> {
                        existing.setName(t.getName());
                        existing.setAttackRating(t.getAttackRating());
                        existing.setMidfieldRating(t.getMidfieldRating());
                        existing.setDefenseRating(t.getDefenseRating());
                        existing.setOverallRating(t.getOverallRating());
                        teamRepository.save(existing);
                    },
                    () -> teamRepository.save(t)
            );
        });
    }
}