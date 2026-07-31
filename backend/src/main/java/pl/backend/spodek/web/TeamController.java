package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;
import pl.backend.spodek.model.Team;
import pl.backend.spodek.repository.TeamRepository;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {
    private final TeamRepository teamRepository;

    @GetMapping
    public List<Team> getAllTeams() {
        // Sortujemy po overallRating (DESC - od największego)
        return teamRepository.findAll(Sort.by(Sort.Direction.DESC, "overallRating"));
    }

    // NOWA METODA: Tworzenie pojedynczej drużyny z kreatora
    @PostMapping
    public Team createTeam(@RequestBody Team team) {
        // Nadajemy losowy assetId, aby odróżnić drużyny customowe od domyślnych
        if (team.getAssetId() == null)  team.setAssetId( 0 );


        // Zabezpieczenie statystyk dla nowo dodanych drużyn
        if (team.getOverallRating() == null) team.setOverallRating(75);
        if (team.getAttackRating() == null) team.setAttackRating(75);
        if (team.getMidfieldRating() == null) team.setMidfieldRating(75);
        if (team.getDefenseRating() == null) team.setDefenseRating(75);

        return teamRepository.save(team);
    }

    @PutMapping("/{id}")
    public Team updateTeam(@PathVariable String id, @RequestBody Team team) {
        return teamRepository.findById(id)
                .map(existing -> {
                    existing.setAlias(team.getAlias());
                    existing.setName(team.getName());
                    // Zapisujemy nowe pola kolorów i stylów herbu:
                    existing.setPrimaryColor(team.getPrimaryColor());
                    existing.setSecondaryColor(team.getSecondaryColor());
                    existing.setTertiaryColor(team.getTertiaryColor());
                    existing.setQuaternaryColor(team.getQuaternaryColor());
                    existing.setQuinaryColor(team.getQuinaryColor());
                    existing.setShapeType(team.getShapeType());
                    existing.setPatternType(team.getPatternType());
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