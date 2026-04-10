package pl.backend.spodek.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import pl.backend.spodek.model.Match;
import pl.backend.spodek.model.Season;

import java.util.List;

public interface MatchRepository extends MongoRepository<Match, String> {

    List<Match> findBySeasonId(String seasonId);

    List<Match> findBySeasonIdOrderByCreatedAtDesc(String seasonId);

    List<Match> findBySeasonIdAndFinished(String seasonId, boolean finished);

    @Query(value = "{ '$or': [ { 'homeSide.players.playerId': ?0 }, { 'awaySide.players.playerId': ?0 } ] }", count = true)
    long countByPlayerInvolvement(String playerId);
}
