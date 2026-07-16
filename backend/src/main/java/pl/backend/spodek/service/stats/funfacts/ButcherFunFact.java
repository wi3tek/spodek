package pl.backend.spodek.service.stats.funfacts;

import org.springframework.stereotype.Component;
import pl.backend.spodek.dto.FunFact;
import pl.backend.spodek.service.stats.FunFactInput;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class ButcherFunFact implements FunFactService {
    private static final String TITLE = "Kosiarz";
    private static final String ICON = "🟨🟥";

    private static final int YELLOW_CARD_POINTS = 2;
    private static final int RED_CARD_POINTS = 3;

    // Rekord pomocniczy do zapamiętania statystyk każdego kandydata
    private record ButcherCandidate(String alias, int points, int totalCards, int yellowCards, int redCards) {}

    @Override
    public Optional<FunFact> generateFact(FunFactInput input) {
        List<ButcherCandidate> candidates = new ArrayList<>();
        int maxPoints = 0;

        // 1. Zbieramy wszystkich graczy, którzy mają jakiekolwiek kartki i wyliczamy ich punkty
        for (String pId : input.getActivePlayerIds()) {
            int yellow = input.getYellowCardsMap().getOrDefault( pId, 0 );
            int red = input.getRedCardsMap().getOrDefault( pId, 0 );

            int points = (yellow * YELLOW_CARD_POINTS) + (red * RED_CARD_POINTS);

            if (points > 0 && input.getPlayersMap().containsKey( pId )) {
                String alias = input.getPlayersMap().get( pId ).getAlias();
                candidates.add( new ButcherCandidate( alias, points, yellow + red, yellow, red ) );

                // Aktualizujemy rekord maksymalnej ilości punktów
                if (points > maxPoints) {
                    maxPoints = points;
                }
            }
        }

        if (maxPoints == 0 || candidates.isEmpty()) {
            return Optional.empty();
        }

        final int finalMaxPoints = maxPoints;

        // 2. Wyciągamy graczy z maksymalną liczbą punktów (limitujemy do 3)
        List<ButcherCandidate> topButchers = candidates.stream()
                .filter( c -> c.points() == finalMaxPoints )
                .limit( 3 )
                .toList();

        // 3. Budujemy komunikat w zależności od tego, czy jest remis
        if (topButchers.isEmpty()) return Optional.empty();

        String description = "DEBILE nie faulujciee";
        List<FunFact.FunFactItem> items = topButchers.stream()
                .map( b -> new FunFact.FunFactItem(
                        b.alias(),
                        b.totalCards() + " kartek (ż: " + b.yellowCards() + ", cz: " + b.redCards() + ")"
                ) ).toList();

        return Optional.of( new FunFact( TITLE, description, ICON, items ) );
    }
}