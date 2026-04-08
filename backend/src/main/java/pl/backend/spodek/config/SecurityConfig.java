package pl.backend.spodek.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import pl.backend.spodek.repository.UserRepository;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final UserRepository userRepository;
    private final JwtAuthenticationFilter jwtAuthFilter; // Wstrzykujemy nasz nowy filtr

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf( AbstractHttpConfigurer::disable )
                .sessionManagement( session -> session.sessionCreationPolicy( SessionCreationPolicy.STATELESS ) )
                .authorizeHttpRequests( auth -> auth
                        .requestMatchers( "/api/auth/**" ).permitAll()
                        .anyRequest().authenticated()
                )
                .formLogin( AbstractHttpConfigurer::disable )
                .httpBasic( AbstractHttpConfigurer::disable )
                // KLUCZOWE: Dodajemy filtr przed domyślnym filtrem autoryzacji
                .addFilterBefore( jwtAuthFilter, UsernamePasswordAuthenticationFilter.class )
                .cors( cors -> cors.configurationSource( corsConfigurationSource() ) );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Tutaj dodasz URL swojego frontu po wdrożeniu na Render:
        configuration.setAllowedOrigins( List.of( "http://localhost:4200", "https://twoja-nazwa-frontu.onrender.com" ) );
        configuration.setAllowedMethods( List.of( "GET", "POST", "PUT", "DELETE", "OPTIONS" ) );
        configuration.setAllowedHeaders( List.of( "Authorization", "Content-Type" ) );
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration( "/**", configuration );
        return source;
    }
}