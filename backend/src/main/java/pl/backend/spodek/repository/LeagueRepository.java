package pl.backend.spodek.repository;


import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import pl.backend.spodek.model.League;

@Repository
public interface LeagueRepository extends MongoRepository<League, String> {

}