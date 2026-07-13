package pl.backend.spodek.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import pl.backend.spodek.model.Season;

import java.util.List;

public interface SeasonRepository extends MongoRepository<Season, String> {

    List<Season> findByLeagueId(String leagueId);

    // Pobiera z bazy tylko pole 'leagueId' dla podanego ID sezonu
    @Query(value = "{ '_id': ?0 }", fields = "{ 'leagueId' : 1, '_id' : 0 }")
    String findLeagueIdById(String seasonId);
}
