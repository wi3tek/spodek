package pl.backend.spodek.migration.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class LeagueMigrationDto {
    private String name;
    private String logoUrl;
    private String description;
    private String type;
    private LocalDateTime creationDate;
    private LocalDateTime lastModificationDate;
}