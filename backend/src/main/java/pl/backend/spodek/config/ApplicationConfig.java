package pl.backend.spodek.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider; // NOWY IMPORT
import org.springframework.security.authentication.dao.DaoAuthenticationProvider; // NOWY IMPORT
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import pl.backend.spodek.repository.UserRepository;
import pl.backend.spodek.security.AppUserContext;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class ApplicationConfig {

    private final UserRepository userRepository;

    @Bean
    public UserDetailsService userDetailsService() {
        return identifier -> {
            // Szukamy po mailu lub nazwie
            var user = userRepository.findByEmailOrName(identifier, identifier)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found: " + identifier));

            // Zwracamy nasz nowy, bogaty w dane kontener (który ma w sobie ID do audytu!)
            return new AppUserContext(
                    user.getId(),
                    user.getEmail(),
                    user.getName(),
                    user.getPassword(),
                    List.of(new SimpleGrantedAuthority(user.getRole() != null ? user.getRole() : "ROLE_USER"))
            );
        };
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder());

        return authProvider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}