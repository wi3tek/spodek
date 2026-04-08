package pl.backend.spodek.model;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

// pl.backend.spodek.model.Team
@Document(collection = "teams")
@Data
@EqualsAndHashCode(callSuper = true) // Ważne przy Lombok i dziedziczeniu!
public class Team extends BaseDocument {
    @Id
    private String id;
    private Integer assetId;
    private String name;
    private String alias;

    private Integer attackRating;
    private Integer midfieldRating;
    private Integer defenseRating;
    private Integer overallRating;

    private Double longitude;
    private Double latitude;
    private Integer internationalPrestige;
}