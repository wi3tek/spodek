package pl.backend.spodek.model;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "matchweeks")
@Data
@EqualsAndHashCode(callSuper = true)
// Obsługuje: findBySeasonIdAndMatchweek z blokadą duplikatów kolejki w sezonie
@CompoundIndex(name = "matchweek_season_week_uidx", def = "{'seasonId': 1, 'matchweek': 1}", unique = true)
public class Matchweek extends BaseDocument {

    @Id
    private String id;

    private String seasonId;
    private int matchweek;

    // Lista zaznaczonych graczy na dany wieczór
    private List<String> presentPlayerIds = new ArrayList<>();

    // Flaga, która w przyszłości pozwoli nam "zamknąć" kolejkę
    private boolean finished = false;
}