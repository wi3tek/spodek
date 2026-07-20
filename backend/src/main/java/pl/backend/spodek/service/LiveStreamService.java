package pl.backend.spodek.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import pl.backend.spodek.dto.LiveResponse;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
public class LiveStreamService {

    // Mapa przechowująca emitery (połączenia) dla każdego kodu sezonu z osobna
    private final Map<String, List<SseEmitter>> emittersMap = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String seasonCode) {
        SseEmitter emitter = new SseEmitter(0L); // 0L oznacza brak timeoutu po stronie serwera

        emittersMap.computeIfAbsent(seasonCode, k -> new CopyOnWriteArrayList<>()).add(emitter);

        // Usuwanie martwych połączeń z listy
        emitter.onCompletion(() -> removeEmitter(seasonCode, emitter));
        emitter.onTimeout(() -> removeEmitter(seasonCode, emitter));
        emitter.onError(e -> removeEmitter(seasonCode, emitter));

        try {
            // Wysłanie sygnału powitalnego natychmiast po połączeniu
            emitter.send(SseEmitter.event().name("INIT").data("Connected to Kanapa Live!"));
        } catch (IOException e) {
            removeEmitter(seasonCode, emitter);
        }
        return emitter;
    }

    private void removeEmitter(String seasonCode, SseEmitter emitter) {
        List<SseEmitter> list = emittersMap.get(seasonCode);
        if (list != null) {
            list.remove(emitter);
        }
    }

    // Wypycha nowy model LiveResponse do wszystkich kibiców oglądających dany sezon
    public void broadcastUpdate(String seasonCode, LiveResponse liveResponse) {
        List<SseEmitter> emitters = emittersMap.get(seasonCode);
        if (emitters != null) {
            emitters.forEach(emitter -> {
                try {
                    // JSON leci do frontendu z typem zdarzenia "UPDATE"
                    emitter.send(SseEmitter.event().name("UPDATE").data(liveResponse));
                } catch (IOException e) {
                    removeEmitter(seasonCode, emitter);
                }
            });
        }
    }

    // Utrzymywanie połączenia z Railway (Wysyłane co 15 sekund)
    @Scheduled(fixedRate = 15000)
    public void sendHeartbeat() {
        emittersMap.forEach((seasonCode, emitters) -> {
            emitters.forEach(emitter -> {
                try {
                    emitter.send(SseEmitter.event().name("PING").data("keep-alive"));
                } catch (IOException e) {
                    removeEmitter(seasonCode, emitter);
                }
            });
        });
    }
}