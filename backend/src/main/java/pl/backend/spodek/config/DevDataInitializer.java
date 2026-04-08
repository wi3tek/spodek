//package pl.backend.spodek.config;
//
//
//import lombok.RequiredArgsConstructor;
//import org.springframework.boot.CommandLineRunner;
//import org.springframework.context.annotation.Profile;
//import org.springframework.stereotype.Component;
//import pl.backend.spodek.model.League;
//import pl.backend.spodek.repository.LeagueRepository;
//
//@Component
//@Profile("dev") // Uruchomi się TYLKO, gdy aktywny jest profil "dev"
//@RequiredArgsConstructor
//public class DevDataInitializer implements CommandLineRunner {
//
//    private final LeagueRepository leagueRepository;
//
//    @Override
//    public void run(String... args) throws Exception {
//        System.out.println( "🔧 Uruchomiono profil DEV..." );
//
//        // Sprawdzamy, czy baza jest pusta, żeby nie dodawać w kółko tego samego
//        if (leagueRepository.count() == 0) {
//            System.out.println( "🌱 Baza MongoDB jest pusta. Generowanie testowych lig..." );
//
//            leagueRepository.save( prepareLeague( "Ekstraklasa IT", "ACTIVE" ) );
//            leagueRepository.save( prepareLeague( "Liga Szóstek - Wiosna", "ACTIVE" ) );
//            leagueRepository.save( prepareLeague( "Turniej Zakładowy", "ARCHIVED" ) );
//
//            System.out.println( "✅ Przykładowe ligi zostały dodane!" );
//        } else {
//            System.out.println( "ℹ️ Baza zawiera już dane. Pomijam inicjalizację." );
//        }
//    }
//
//    private League prepareLeague(String name, String active) {
//        return League.builder()
//                .name( name )
//                .status( active )
//                .build();
//    }
//}