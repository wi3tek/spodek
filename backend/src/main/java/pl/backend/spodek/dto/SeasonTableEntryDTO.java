package pl.backend.spodek.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SeasonTableEntryDTO {
    private String playerId;
    private String alias;
    private int matchesPlayed;
    private int points;
    private int wins;
    private int draws;
    private int losses;
    private int goalsScored;
    private int goalsLost;
    private int goalDifference;
    private int yellowCards;
    private int redCards;
    private int assists;
    private BigDecimal winRatio;
}