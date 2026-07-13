package pl.backend.spodek.rating.model.enums;

import lombok.Getter;

@Getter
public enum GameResult {

    WIN(1),
    LOSE(0),
    DRAW(0.5);

    private final double resultValue;

    GameResult(double resultValue) {
        this.resultValue=resultValue;
    }
}
