package pl.backend.spodek.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import pl.backend.spodek.model.Season;

import java.util.List;

public interface SeasonRepository extends MongoRepository<Season, String> {

    List<Season> findByLeagueId(String leagueId);
}
