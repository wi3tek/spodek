package pl.backend.spodek.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.mongodb.config.AbstractMongoClientConfiguration;
import org.springframework.data.mongodb.core.MongoTemplate;

@Configuration
@Profile("dev")
public class MongoConfig extends AbstractMongoClientConfiguration {

    @Value("${spring.data.mongodb.database}")
    public String database;

    @Value("${spring.data.mongodb.host}")
    public String host;

    @Value("${spring.data.mongodb.port}")
    public String port;

    @Override
    @Bean
    public MongoClient mongoClient() {
        return MongoClients.create( "mongodb://%s:%s".formatted( host, port ) );
    }

    @Bean
    public MongoTemplate mongoTemplate() {
        return new MongoTemplate( mongoClient(), getDatabaseName() );
    }

    @Override
    protected String getDatabaseName() {
        return database;
    }

    @Override
    protected boolean autoIndexCreation() {
        return true;
    }
}