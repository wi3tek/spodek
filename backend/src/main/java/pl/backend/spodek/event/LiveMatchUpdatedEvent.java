package pl.backend.spodek.event;

public record LiveMatchUpdatedEvent(String seasonCode, String leagueId, String seasonId) {}