package pl.backend.spodek.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.backend.spodek.dto.*;
import pl.backend.spodek.model.Season;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LiveService {

    private final SeasonService seasonService;
    private final MatchService matchService;


    public LiveResponse getLiveResults(String seasonCode) {
        Season season = seasonService.getBySeasonCode( seasonCode );
        List<MatchDTO> matchesBySeason = matchService.getMatchesBySeason( season.getId() );
        List<SeasonTableEntryDTO> seasonTable = seasonService.getSeasonTable( season.getId() );

        return LiveResponse.builder()
                .season(season)
                .matches(matchesBySeason)
                .table(seasonTable)
                .build();
    }
}
