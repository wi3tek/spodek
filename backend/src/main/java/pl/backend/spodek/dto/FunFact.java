package pl.backend.spodek.dto;
import java.util.List;

public record FunFact(String title, String description, String icon, List<FunFactItem> items) {
    // Zagnieżdżony rekord dla wygody
    public record FunFactItem(String label, String value) {}
}