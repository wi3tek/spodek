package pl.backend.spodek.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.backend.spodek.model.Season;

import java.util.List;

@Data
@AllArgsConstructor
@Builder
@NoArgsConstructor
public class LiveResponse {

    private Season season;
    private List<MatchDTO> matches;
    private List<SeasonTableEntryDTO> table;
}
