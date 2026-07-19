package pl.backend.spodek.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import pl.backend.spodek.model.Season;

import java.util.List;
import java.util.Optional;

public interface SeasonRepository extends MongoRepository<Season, String> {

    List<Season> findByLeagueId(String leagueId);

    @Query(value = "{ '_id': ?0 }", fields = "{ 'leagueId' : 1, '_id' : 0 }")
    LeagueIdProjection findLeagueIdById(String seasonId);

    Optional<Season> findByLiveCode(String liveCode);
}
