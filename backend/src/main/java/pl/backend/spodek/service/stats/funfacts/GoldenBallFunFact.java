package pl.backend.spodek.service.stats.funfacts;

import org.springframework.stereotype.Component;
import pl.backend.spodek.dto.FunFact;
import pl.backend.spodek.service.stats.FunFactInput;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Component
public class GoldenBallFunFact implements FunFactService {

    private static final String TITLE = "Złota Piłka";
    private static final String ICON = "👑";

    // Waga punktów karnych do klasyfikacji Fair Play (przy remisach)
    private static final int YELLOW_CARD_PENALTY = 1;
    private static final int RED_CARD_PENALTY = 3; // Czerwona kartka waży więcej

    // Rekord przechowujący szczegółowe statystyki kandydata
    private record GoldenBallCandidate(String alias, int points, int goals, int assists, int penaltyPoints) {}

    @Override
    public Optional<FunFact> generateFact(FunFactInput input) {
        List<GoldenBallCandidate> candidates = new ArrayList<>();

        // 1. Zbieramy wszystkich graczy i wyliczamy ich statystyki
        for (String pId : input.getActivePlayerIds()) {
            int goals = input.getGoalsMap().getOrDefault(pId, 0);
            int assists = input.getAssistsMap().getOrDefault(pId, 0);
            int points = goals + assists; // Klasyfikacja kanadyjska

            if (points > 0 && input.getPlayersMap().containsKey(pId)) {
                int yellow = input.getYellowCardsMap().getOrDefault(pId, 0);
                int red = input.getRedCardsMap().getOrDefault(pId, 0);

                // Liczymy punkty karne za Fair Play
                int penalties = (yellow * YELLOW_CARD_PENALTY) + (red * RED_CARD_PENALTY);

                String alias = input.getPlayersMap().get(pId).getAlias();
                candidates.add(new GoldenBallCandidate(alias, points, goals, assists, penalties));
            }
        }

        if (candidates.isEmpty()) {
            return Optional.empty();
        }

        // 2. Sortowanie wyników:
        // Najpierw: Punkty kanadyjskie MALEJĄCO (reversed)
        // Potem: Punkty karne ROSNĄCO (im mniejsza kara, tym lepsze miejsce - Fair Play)
        Comparator<GoldenBallCandidate> comparator = Comparator
                .comparingInt(GoldenBallCandidate::points).reversed()
                .thenComparingInt(GoldenBallCandidate::penaltyPoints);

        candidates.sort(comparator);

        // Wyciągamy gracza z pierwszego miejsca
        GoldenBallCandidate best = candidates.get(0);

        // 3. Wyciągamy graczy, którzy mają DOKŁADNIE taki sam idealny wynik (remis w kanadyjce ORAZ w Fair Play)
        List<GoldenBallCandidate> topPlayers = candidates.stream()
                .filter(c -> c.points() == best.points() && c.penaltyPoints() == best.penaltyPoints())
                .limit(3)
                .toList();

        // 4. Budujemy odpowiedni komunikat
        if (topPlayers.isEmpty()) return Optional.empty();

        String description = "Lider klasyfikacji kanadyjskiej";
        List<FunFact.FunFactItem> items = topPlayers.stream()
                .map(b -> new FunFact.FunFactItem(
                        b.alias(),
                        b.points() + " pkt (⚽ " + b.goals() + ", 👟 " + b.assists() + ")"
                )).toList();

        return Optional.of(new FunFact(TITLE, description, ICON, items));
    }
}