package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.backend.spodek.dto.MatchmakingDto;
import pl.backend.spodek.matchmaking.MatchmakingService;

import java.util.List;

@RestController
@RequestMapping("/api/matchmaking")
@RequiredArgsConstructor
public class MatchmakingController {

    private final MatchmakingService matchmakingService;

    @PostMapping("/suggest")
    public ResponseEntity<List<MatchmakingDto.Suggestion>> suggestMatches(@RequestBody MatchmakingDto.Request request) {
        List<MatchmakingDto.Suggestion> suggestions = matchmakingService.generateSuggestions(request);
        return ResponseEntity.ok(suggestions);
    }
}