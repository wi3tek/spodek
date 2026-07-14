package pl.backend.spodek.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import pl.backend.spodek.model.Match;

import java.time.LocalDateTime;
import java.util.List;

public interface MatchRepository extends MongoRepository<Match, String> {

    List<Match> findBySeasonId(String seasonId);

    List<Match> findBySeasonIdOrderByCreatedAtDesc(String seasonId);

    List<Match> findBySeasonIdAndFinished(String seasonId, boolean finished);

    @Query(value = "{ '$or': [ { 'homeSide.players.playerId': ?0 }, { 'awaySide.players.playerId': ?0 } ] }", count = true)
    long countByPlayerInvolvement(String playerId);

    List<Match> findByLeagueIdAndFinishedAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(String league, boolean finished, LocalDateTime changeTime);

    List<Match> findBySeasonIdAndMatchweek(String s, int matchweek);
}
