package pl.backend.spodek.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import pl.backend.spodek.model.PlayerRatingHistory;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PlayerRatingHistoryRepository extends MongoRepository<PlayerRatingHistory, String> {

    Optional<PlayerRatingHistory> findFirstByLeagueIdAndPlayerIdOrderByCreatedAtDesc(String leagueId, String playerId);

    void deleteByLeagueIdAndCreatedAtGreaterThanEqual(String league, LocalDateTime changeTime);

    List<PlayerRatingHistory> findByLeagueIdOrderByCreatedAtAsc(String leagueId);
}
