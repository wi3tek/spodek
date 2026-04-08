package pl.backend.spodek.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import pl.backend.spodek.model.Team;

import java.util.Optional;

public interface TeamRepository extends MongoRepository<Team, String> {

    Optional<Team> findByAssetId(Integer assetId);
}