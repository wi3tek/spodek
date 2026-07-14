package pl.backend.spodek.matchmaking;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "matchmaking")
public class MatchmakingProperties {

    private Weights weights = new Weights();
    private Streaks streaks = new Streaks();

    @Data
    public static class Weights {
        private int globalMatchDifferencePenalty;
        private History history = new History();
        private Elo elo = new Elo(); // Dodane dla naszego systemu ratingu

        @Data
        public static class History {
            private int sameTeamPenalty;
            private int sameOpponentPenalty;
        }

        @Data
        public static class Elo {
            private double differenceWeight = 0.5; // Domyślny mnożnik dla różnicy sił
        }
    }

    @Data
    public static class Streaks {
        private PlayedConsecutive playedConsecutive = new PlayedConsecutive();
        private BenchedConsecutive benchedConsecutive = new BenchedConsecutive();

        @Data
        public static class PlayedConsecutive {
            private int level1;
            private int level2;
            private int level3;
            private int level4;
        }

        @Data
        public static class BenchedConsecutive {
            private int level1;
            private int level2;
        }
    }
}