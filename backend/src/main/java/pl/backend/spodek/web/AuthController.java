package pl.backend.spodek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
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

    // pl.backend.spodek.web.AuthController (fragment)

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        // Ważne: Zmień w swojej klasie LoginRequest z 'email' na 'login' lub 'identifier'
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getLogin(), request.getPassword())
        );

        // Szukamy po mailu LUB nazwie tak samo jak w UserDetailsService
        var user = userRepository.findByEmailOrName(request.getLogin(), request.getLogin())
                .orElseThrow(() -> new RuntimeException("Użytkownik nie istnieje"));

        // Generujemy token dla obiektu bazy (albo lepiej, dla AppUserContext!)
        String token = jwtService.generateToken(user);
        return new LoginResponse(token, user.getName()); // Zwracamy name do przywitania!
    }
}