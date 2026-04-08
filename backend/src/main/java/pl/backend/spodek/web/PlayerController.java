package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import pl.backend.spodek.model.Player;
import pl.backend.spodek.repository.PlayerRepository;

import java.util.List;

@RestController
@RequestMapping("/api/players")
@RequiredArgsConstructor
public class PlayerController {

    private final PlayerRepository playerRepository;

    @GetMapping
    public List<Player> getAllPlayers() {
        return playerRepository.findAll();
    }

    @PostMapping
    public Player createPlayer(@RequestBody Player player) {
        return playerRepository.save( player );
    }

    @PutMapping("/{id}")
    public Player updatePlayer(@PathVariable String id, @RequestBody Player player) {
        return playerRepository.findById( id )
                .map( existing -> {
                    existing.setName( player.getName() );
                    existing.setAlias( player.getAlias() );
                    return playerRepository.save( existing );
                } )
                .orElseThrow( () -> new RuntimeException( "Nie ma takiego gracza" ) );
    }
}
