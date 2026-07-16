package pl.backend.spodek.service.stats.model;

import lombok.Data;

@Data
public class MatchTracker {
    private int matches = 0;
    private int wins = 0;
    private int draws = 0;  // NOWE
    private int losses = 0; // NOWE
    private int goalsFor = 0;
    private int goalsAgainst = 0;

    // Zaktualizowana metoda przyjmująca również informację o remisie
    public void addMatch(boolean isWin, boolean isDraw, int gf, int ga) {
        this.matches++;
        if (isWin) {
            this.wins++;
        } else if (isDraw) {
            this.draws++;
        } else {
            this.losses++;
        }
        this.goalsFor += gf;
        this.goalsAgainst += ga;
    }
}