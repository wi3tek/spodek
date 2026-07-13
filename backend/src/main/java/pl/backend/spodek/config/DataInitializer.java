package pl.backend.spodek.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import pl.backend.spodek.model.AppUser;
import pl.backend.spodek.repository.UserRepository;


@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password}")
    private String adminPassword;

    @Value("${app.admin.name:admin}")
    private String adminName;

    @Override
    public void run(String... args) {
        // Sprawdzamy po mailu LUB nazwie
        if (userRepository.findByEmailOrName(adminEmail, adminName).isEmpty()) {
            AppUser admin = new AppUser();
            admin.setEmail(adminEmail);
            admin.setName(adminName); // <--- Tego brakowało
            admin.setPassword(passwordEncoder.encode(adminPassword));
            // Dobra praktyka Spring Security: Zawsze dodawaj prefiks ROLE_
            admin.setRole("ROLE_ADMIN");

            userRepository.save(admin);
            log.info( ">>> SuperAdmin created! Email: {} | Name: {}", adminEmail, adminName );
        }
    }
}