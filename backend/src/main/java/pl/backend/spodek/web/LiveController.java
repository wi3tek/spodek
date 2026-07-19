package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.backend.spodek.dto.LiveResponse;
import pl.backend.spodek.dto.SeasonTableEntryDTO;
import pl.backend.spodek.model.Season;
import pl.backend.spodek.repository.SeasonRepository;
import pl.backend.spodek.service.LiveService;
import pl.backend.spodek.service.SeasonService;

import java.util.Comparator;
import java.util.List;

@RequestMapping("/api/public")
@RestController
@RequiredArgsConstructor
public class LiveController {

    private final LiveService liveService;

    @GetMapping("/live/{seasonCode}")
    public LiveResponse getSeasonsByLeague(@PathVariable String seasonCode) {
        return liveService.getLiveResults( seasonCode );
    }
}
