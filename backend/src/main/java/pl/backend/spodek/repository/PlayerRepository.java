package pl.backend.spodek.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import pl.backend.spodek.model.Player;
import pl.backend.spodek.model.Team;

import java.util.Optional;

public interface PlayerRepository extends MongoRepository<Player, String> {

}