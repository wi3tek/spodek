package pl.backend.spodek.service.stats;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.backend.spodek.dto.FunFact;
import pl.backend.spodek.service.stats.funfacts.FunFactService;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FunFactFactory {

    private final List<FunFactService> strategies;

    public List<FunFact> generateFunFacts(FunFactInput input) {
        return strategies.stream()
                .map(strategy -> strategy.generateFact(input))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());
    }
}