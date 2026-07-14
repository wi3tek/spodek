package pl.backend.spodek.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import pl.backend.spodek.model.Matchweek;

import java.util.Optional;

public interface MatchweekRepository extends MongoRepository<Matchweek, String> {

    Optional<Matchweek> findBySeasonIdAndMatchweek(String seasonId, int matchweek);

}