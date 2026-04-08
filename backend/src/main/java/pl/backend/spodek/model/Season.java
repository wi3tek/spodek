package pl.backend.spodek.model;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

// pl.backend.spodek.model.Season
@Document(collection = "seasons")
@Data
@EqualsAndHashCode(callSuper = true)
public class Season extends BaseDocument {

    @Id
    private String id;
    private String name;     // np. "Wiosna 2026", "Edycja Kawalerska"
    private String leagueId; // Klucz do ligi
    private String status;   // ACTIVE, FINISHED
}