package pl.backend.spodek.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pl.backend.spodek.model.Matchweek;
import pl.backend.spodek.repository.MatchweekRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchweekService {

    private final MatchweekRepository matchweekRepository;

    // Pobiera istniejącą sesję lub tworzy nową (pustą), jeśli to pierwsza interakcja
    public Matchweek getOrCreateMatchweek(String seasonId, int matchweekNumber) {
        return matchweekRepository.findBySeasonIdAndMatchweek(seasonId, matchweekNumber)
                .orElseGet(() -> {
                    log.info("Tworzę nową sesję dla sezonu {} i kolejki {}", seasonId, matchweekNumber);
                    Matchweek newMatchweek = new Matchweek();
                    newMatchweek.setSeasonId(seasonId);
                    newMatchweek.setMatchweek(matchweekNumber);
                    return matchweekRepository.save(newMatchweek);
                });
    }

    // Aktualizuje listę obecności wysłaną z modala w Angularze
    public Matchweek updateAttendance(String seasonId, int matchweekNumber, List<String> presentPlayerIds) {
        Matchweek matchweek = getOrCreateMatchweek(seasonId, matchweekNumber);

        if (matchweek.isFinished()) {
            throw new IllegalStateException("Nie można zmieniać obecności w zamkniętej kolejce!");
        }

        matchweek.setPresentPlayerIds(presentPlayerIds);

        log.info("Zaktualizowano listę obecności dla sezonu {}, kolejki {}. Zaznaczono {} graczy.",
                seasonId, matchweekNumber, presentPlayerIds.size());

        return matchweekRepository.save(matchweek);
    }
}