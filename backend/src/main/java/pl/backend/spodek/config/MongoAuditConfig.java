package pl.backend.spodek.config;

// src/main/java/com/twojprojekt/config/MongoAuditConfig.java

import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import pl.backend.spodek.security.AppUserContext;

import java.util.Optional;

@Configuration
@EnableMongoAuditing // TO JEST KLUCZOWE! Włącza nasłuchiwanie na zapis do bazy
public class MongoAuditConfig implements AuditorAware<String> {

    @Override
    public Optional<String> getCurrentAuditor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals( "anonymousUser" )) {
            return Optional.of( "system" );
        }

        // TAAAA DAAAM! Mamy dostęp do naszego obiektu!
        if (auth.getPrincipal() instanceof AppUserContext userContext) {
            return Optional.of( userContext.getId() ); // Zwraca np. "65abc123def456"
        }

        return Optional.ofNullable( auth.getName() ).or( () -> Optional.of( "system" ) );
    }
}
