package pl.backend.spodek.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import pl.backend.spodek.service.SeasonService;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class LiveEventPublisher { // Usunięto zbędne "implements"

    private final SeasonService seasonService; // Dodano 'private final' dla Lomboka
    private final ApplicationEventPublisher eventPublisher; // Wstrzykujemy prawdziwy silnik Springa

    public void publishEvent(String seasonId, String leagueId) {

        // ZABEZPIECZENIE: Jeśli leagueId z frontendu jest nullem, dociągamy je z bazy (jest cachowane, więc szybkie)
        String safeLeagueId = (leagueId != null) ? leagueId : seasonService.getLeagueIdBySeason(seasonId);
        Optional<String> seasonCodeOptional = seasonService.findSeasonCodeBySeasonId(seasonId);

        seasonCodeOptional.ifPresent(seasonCode ->
                // Zwróć uwagę na kolejność argumentów (seasonCode, leagueId, seasonId)
                eventPublisher.publishEvent(new LiveMatchUpdatedEvent(seasonCode, safeLeagueId, seasonId))
        );

        if (seasonCodeOptional.isEmpty()) {
            log.error("There is no season code for season {}", seasonId);
        }
    }
}