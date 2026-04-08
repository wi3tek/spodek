package pl.backend.spodek.model;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "players")
@Data
@EqualsAndHashCode(callSuper = true)
public class Player extends BaseDocument {

    @Id
    private String id;
    private String name;
    @Indexed(unique = true)
    private String alias;

}