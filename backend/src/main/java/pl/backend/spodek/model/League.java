package pl.backend.spodek.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "leagues")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class League {

    @Id
    private String id;
    private String name;
    private String status;

    // --- POLA AUDYTOWE ---
    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @CreatedBy
    private String createdBy;

    @LastModifiedBy
    private String updatedBy;
}