package pl.backend.spodek.config;

import com.example.fifastats.model.AppUser;
import com.example.fifastats.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        String adminEmail = "patrykwieteskapw@gmail.com";
        if (userRepository.findByEmail(adminEmail).isEmpty()) {
            AppUser admin = new AppUser();
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode("Wietek2026!"));
            admin.setRole("ADMIN");
            userRepository.save(admin);
            System.out.println(">>> SuperAdmin created with email: " + adminEmail);
        }
    }
}