package pl.backend.spodek.rating.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

@Data
@Configuration
@ConfigurationProperties(prefix = "rating")
public class RatingProperties {

    private BigDecimal defaultStartRating;
    private BigDecimal matchWeightIndexDefault;
    private BigDecimal ratingDifferenceIndex;

}