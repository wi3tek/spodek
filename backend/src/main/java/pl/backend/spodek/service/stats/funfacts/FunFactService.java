package pl.backend.spodek.service.stats.funfacts;

import pl.backend.spodek.dto.FunFact;
import pl.backend.spodek.service.stats.FunFactInput;
import pl.backend.spodek.service.stats.model.MatchTracker;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

public interface FunFactService {

    Optional<FunFact> generateFact(FunFactInput input);

    record RelationResult(String p1, String p2, double ratio) {}

    // Metoda pomocnicza dostępna dla wszystkich strategii szukających najlepszych par
    default Optional<RelationResult> findBestRelation(Map<String, Map<String, MatchTracker>> relationsMap, int minMatches, boolean findMax, Set<String> activePlayerIds) {
        double bestWr = findMax ? -1.0 : 1.1;
        String p1 = null, p2 = null;

        for (var p1Entry : relationsMap.entrySet()) {
            if (!activePlayerIds.contains(p1Entry.getKey())) continue;

            for (var p2Entry : p1Entry.getValue().entrySet()) {
                if (!activePlayerIds.contains(p2Entry.getKey())) continue;

                MatchTracker tr = p2Entry.getValue();
                if (tr.getMatches() >= minMatches) {
                    double wr = (double) tr.getWins() / tr.getMatches();
                    if ((findMax && wr > bestWr) || (!findMax && wr < bestWr)) {
                        bestWr = wr; p1 = p1Entry.getKey(); p2 = p2Entry.getKey();
                    }
                }
            }
        }
        return (p1 != null) ? Optional.of(new RelationResult(p1, p2, bestWr)) : Optional.empty();
    }
}