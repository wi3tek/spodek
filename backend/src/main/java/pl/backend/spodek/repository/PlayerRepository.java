package pl.backend.spodek.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import pl.backend.spodek.model.Player;

public interface PlayerRepository extends MongoRepository<Player, String> {

}