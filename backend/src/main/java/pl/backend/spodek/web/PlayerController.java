package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.backend.spodek.model.Player;
import pl.backend.spodek.repository.PlayerRepository;
import pl.backend.spodek.service.AdminService;

import java.util.List;

@RestController
@RequestMapping("/api/players")
@RequiredArgsConstructor
public class PlayerController {

    private final PlayerRepository playerRepository;
    private final AdminService adminService;

    @GetMapping
    public List<Player> getAll() {
        // Tu korzystamy z mapy keszowanej, zamienionej na listę
        return adminService.getPlayersMap().values().stream().toList();
    }

    @PostMapping
    public ResponseEntity<Player> create(@RequestBody Player player) {
        // Serwis obsłuży czyszczenie cache (@CacheEvict)
        return ResponseEntity.ok(adminService.savePlayer(player));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Player> update(@PathVariable String id, @RequestBody Player player) {
        player.setId(id);
        return ResponseEntity.ok(adminService.savePlayer(player));
    }
}
