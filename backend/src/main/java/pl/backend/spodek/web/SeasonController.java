package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.backend.spodek.model.Season;
import pl.backend.spodek.repository.SeasonRepository;

import java.util.List;

@RequestMapping("/api/seasons")
@RestController
@RequiredArgsConstructor
public class SeasonController {

    private final SeasonRepository seasonRepository;

    @GetMapping("/league/{leagueId}")
    public List<Season> getSeasonForLeague(
            @PathVariable("leagueId") String leagueId
    ) {
        return seasonRepository.findByLeagueId(leagueId);
    }
}
