package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pl.backend.spodek.dto.LoginRequest;
import pl.backend.spodek.dto.LoginResponse;
import pl.backend.spodek.config.JwtService;
import pl.backend.spodek.repository.UserRepository;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    // Zakładamy 24h w sekundach, spójnie z JwtService
    private static final long JWT_EXPIRATION_SECONDS = 3600L;

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getLogin(), request.getPassword())
        );

        var user = userRepository.findByEmailOrName(request.getLogin(), request.getLogin())
                .orElseThrow(() -> new RuntimeException("Użytkownik nie istnieje"));

        String token = jwtService.generateToken(user);

        // Zwracamy token, nazwę oraz czas wygaśnięcia[cite: 23]
        return new LoginResponse(token, user.getName(), JWT_EXPIRATION_SECONDS);
    }

    @PostMapping("/refresh")
    public LoginResponse refreshToken(Authentication authentication) {
        // Do tego endpointu dotrą tylko żądania, które przeszły pomyślnie przez JwtAuthenticationFilter.
        // Oznacza to, że stary token jest nadal ważny.
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();

        // Generujemy świeży token na kolejne 24h
        String newToken = jwtService.generateToken(userDetails);

        return new LoginResponse(newToken, userDetails.getUsername(), JWT_EXPIRATION_SECONDS);
    }
}