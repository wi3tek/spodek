package pl.backend.spodek.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j; // Biblioteka do logów
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import pl.backend.spodek.model.Player;
import pl.backend.spodek.model.Team;
import pl.backend.spodek.repository.PlayerRepository;
import pl.backend.spodek.repository.TeamRepository;

import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {
    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;

    // Cacheable: Jeśli dane są w cache, metoda w ogóle się nie wykona (brak logu MISS)
    @Cacheable(value = "playersCache")
    public Map<String, Player> getPlayersMap() {
        log.info("⚠️ [CACHE MISS] Pobieram wszystkich GRACZY z MongoDB...");
        return playerRepository.findAll().stream()
                .collect(Collectors.toMap(Player::getId, p -> p));
    }

    @Cacheable(value = "teamsCache")
    public Map<String, Team> getTeamsMap() {
        log.info("⚠️ [CACHE MISS] Pobieram wszystkie DRUŻYNY z MongoDB...");
        return teamRepository.findAll().stream()
                .collect(Collectors.toMap(Team::getId, t -> t));
    }

    // CacheEvict: Każda zmiana "zabija" stary cache
    @CacheEvict(value = "playersCache", allEntries = true)
    public Player savePlayer(Player player) {
        log.warn("🧹 [CACHE EVICT] Zmiana w graczach - czyszczę cache.");
        return playerRepository.save(player);
    }

    @CacheEvict(value = "teamsCache", allEntries = true)
    public Team saveTeam(Team team) {
        log.warn("🧹 [CACHE EVICT] Zmiana w drużynach - czyszczę cache.");
        return teamRepository.save(team);
    }
}