package pl.backend.spodek.model;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "matchweeks")
@Data
@EqualsAndHashCode(callSuper = true)
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