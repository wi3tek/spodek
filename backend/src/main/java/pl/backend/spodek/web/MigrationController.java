package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pl.backend.spodek.migration.MigrationService;
import pl.backend.spodek.migration.dto.LeagueMigrationDto;
import tools.jackson.databind.ObjectMapper;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Slf4j
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
    // NOWA METODA DO AKTUALIZACJI FLAG
    @PostMapping(value = "/update-flags", consumes = "multipart/form-data")
    public ResponseEntity<String> updateTeamFlags(@RequestParam("file") MultipartFile file) {
        String targetDirStr = "D:\\Projekty\\2026\\spodek\\frontend\\public\\logos\\light";
        Path targetDir = Paths.get(targetDirStr);

        try {
            // Sprawdzenie czy folder docelowy istnieje
            if (!Files.exists(targetDir)) {
                return ResponseEntity.badRequest().body("Ścieżka docelowa nie istnieje: " + targetDirStr);
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
            String line;
            boolean isFirstLine = true;
            int successCount = 0;
            int errorCount = 0;

            while ((line = reader.readLine()) != null) {
                // Pomijamy nagłówek CSV
                if (isFirstLine) {
                    isFirstLine = false;
                    continue;
                }

                // Parsujemy CSV (separator to średnik)
                String[] columns = line.split(";");
                if (columns.length < 3) continue;

                String country = columns[0].trim();
                String flagUrl = columns[1].trim();
                String assetId = columns[2].trim();

                try {
                    Path currentImgPath = targetDir.resolve(assetId + ".png");
                    Path backupImgPath = targetDir.resolve(assetId + "_notFlag.png");

                    // 1. Zmiana nazwy obecnego pliku, jeśli istnieje
                    if (Files.exists(currentImgPath)) {
                        Files.move(currentImgPath, backupImgPath, StandardCopyOption.REPLACE_EXISTING);
                        log.info("Zmieniono nazwę: {} -> {}", currentImgPath.getFileName(), backupImgPath.getFileName());
                    }

                    // 2. Pobieranie pliku z URL z obejściem blokad (User-Agent)
                    HttpURLConnection connection = (HttpURLConnection) new URL(flagUrl).openConnection();
                    connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

                    try (InputStream in = connection.getInputStream()) {
                        BufferedImage image = ImageIO.read(in);

                        if (image != null) {
                            // 3. Zapis jako PNG
                            ImageIO.write(image, "png", currentImgPath.toFile());
                            log.info("Zapisano nową flagę dla: {} (Asset: {})", country, assetId);
                            successCount++;
                        } else {
                            log.warn("Nie udało się zdekodować obrazka dla: {}", flagUrl);
                            errorCount++;
                        }
                    }

                } catch (Exception e) {
                    log.error("Błąd przetwarzania flagi dla kraju: {} (Asset: {}) - {}", country, assetId, e.getMessage());
                    errorCount++;
                }
            }

            String summary = String.format("Proces zakończony! Zaktualizowano pomyślnie: %d. Błędy: %d.", successCount, errorCount);
            return ResponseEntity.ok(summary);

        } catch (Exception e) {
            log.error("Błąd krytyczny skryptu aktualizacji flag", e);
            return ResponseEntity.status(500).body("Wystąpił błąd: " + e.getMessage());
        }
    }
}