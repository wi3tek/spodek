package pl.backend.spodek.event;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import pl.backend.spodek.dto.LiveResponse;
import pl.backend.spodek.service.LiveService;
import pl.backend.spodek.service.LiveStreamService;
import pl.backend.spodek.service.TeamStatsService;

@Component
@RequiredArgsConstructor
public class LiveUpdateListener {

    private final LiveService liveService;
    private final LiveStreamService liveStreamService;

    // Asynchroniczne wyłapywanie zdarzenia
    @EventListener
    public void onMatchUpdate(LiveMatchUpdatedEvent event) {
        // 1. Zdejmujemy z cache stary wynik
        liveService.clearLiveCache(event.seasonCode());

        // 2. Pobieramy całkowicie świeży LiveResponse (to jednocześnie włoży go z powrotem do cache!)
        LiveResponse freshData = liveService.getLiveResults(event.seasonCode());

        // 3. Wypychamy nowy JSON rurami do wszystkich z podłączonymi telewizorami
        liveStreamService.broadcastUpdate(event.seasonCode(), freshData);
    }

    // Zdejmujemy statystyki z Cache'a!
    @EventListener
    @CacheEvict(value = "stats", key = "#event.leagueId().concat('-').concat(#event.seasonId())")
    public void clearStatsCache(LiveMatchUpdatedEvent event) {}

    @EventListener
    @CacheEvict(value = "teamStats", key = "#event.leagueId().concat('-').concat(#event.seasonId())")
    public void clearTeamStatsCache(LiveMatchUpdatedEvent event) {}
}