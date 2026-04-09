package pl.backend.spodek.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class MatchDTO {
    private String id;
    private String seasonId;
    private int matchweek;
    private LocalDateTime createdAt; // Służy jako godzina meczu
    private LocalDateTime updatedAt; // Służy jako godzina meczu
    private boolean finished;
    private SideDTO homeSide;
    private SideDTO awaySide;

    @Data
    public static class SideDTO {
        private String assetId;
        private String teamId;
        private String teamName;
        private int goals;
        private List<PlayerInfoDTO> players;
    }

    @Data
    public static class PlayerInfoDTO {
        private String playerId;
        private String alias;
        private int goals;
        private int assists;
        private int yellowCards;
        private int redCards;
    }
}