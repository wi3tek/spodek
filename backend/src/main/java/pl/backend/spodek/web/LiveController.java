package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.backend.spodek.dto.LiveResponse;
import pl.backend.spodek.service.LiveService;

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
