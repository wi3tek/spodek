package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pl.backend.spodek.migration.MigrationService;
import pl.backend.spodek.migration.dto.LeagueMigrationDto;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/migration")
@RequiredArgsConstructor
public class MigrationController {

    private final MigrationService migrationService;
    private final ObjectMapper objectMapper;

    @PostMapping(value = "/run", consumes = "multipart/form-data")
    public ResponseEntity<String> runMigration(
            @RequestParam("matches") MultipartFile matchesFile,
            @RequestParam("teams") MultipartFile teamsFile,
            @RequestParam("league") String leagueJson) {
        try {
            // Mapujemy String JSON na DTO
            LeagueMigrationDto leagueDto = objectMapper.readValue(leagueJson, LeagueMigrationDto.class);

            migrationService.runMigration(matchesFile, teamsFile, leagueDto);

            return ResponseEntity.ok("Migracja została zakończona sukcesem!");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Błąd podczas migracji: " + e.getMessage());
        }
    }
}