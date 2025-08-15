package com.sweetpotato.service;

import com.sweetpotato.config.DynamicConfigurationProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

@Service
@Slf4j
@RequiredArgsConstructor
public class FuelBrandLogoService {

    private final DynamicConfigurationProperties configProperties;

    // Brand mapping with common variations and keywords
    private final Map<String, Set<String>> brandPatterns = initializeBrandPatterns();

    // Common station name patterns that indicate specific brands
    private final Map<Pattern, String> stationNamePatterns = initializePatternMap();

    /**
     * Initialize the brand patterns map
     * @return Map of brand keys to their matching patterns
     */
    private static Map<String, Set<String>> initializeBrandPatterns() {
        Map<String, Set<String>> patterns = new HashMap<>();
        patterns.put("shell", Set.of("shell", "royal dutch shell"));
        patterns.put("bp", Set.of("british petroleum", "bp petrol", "bp gas", "bp fuel"));
        patterns.put("bpcl", Set.of("bharat petroleum", "bpcl", "bharatpetroleum"));
        patterns.put("indian-oil", Set.of("indian oil", "indianoil", "iocl", "indane"));
        patterns.put("hpcl", Set.of("hpcl", "hindustan petroleum", "hp petrol", "hp petroleum", "hp fuel"));
        patterns.put("reliance", Set.of("reliance", "reliance industries", "jio-bp"));
        patterns.put("essar", Set.of("essar", "nayara"));
        patterns.put("total", Set.of("total", "totalenergies"));
        patterns.put("adani", Set.of("adani", "adani gas"));
        patterns.put("gulf", Set.of("gulf", "gulf oil"));
        patterns.put("castrol", Set.of("castrol"));
        return patterns;
    }

    /**
     * Initialize the station name pattern map
     * Order matters - more specific patterns should come first to avoid false matches
     * @return Map of patterns to brand names
     */
    private static Map<Pattern, String> initializePatternMap() {
        Map<Pattern, String> patterns = new LinkedHashMap<>();
        
        // Most specific patterns first to avoid cross-matching
        patterns.put(Pattern.compile(".*hpcl.*", Pattern.CASE_INSENSITIVE), "hpcl");
        patterns.put(Pattern.compile(".*hindustan.*petroleum.*", Pattern.CASE_INSENSITIVE), "hpcl");
        patterns.put(Pattern.compile(".*hp.*petrol.*", Pattern.CASE_INSENSITIVE), "hpcl");
        patterns.put(Pattern.compile(".*hp.*petroleum.*", Pattern.CASE_INSENSITIVE), "hpcl");
        patterns.put(Pattern.compile(".*hp.*fuel.*", Pattern.CASE_INSENSITIVE), "hpcl");
        
        patterns.put(Pattern.compile(".*bharat.*petroleum.*", Pattern.CASE_INSENSITIVE), "bpcl");
        patterns.put(Pattern.compile(".*bpcl.*", Pattern.CASE_INSENSITIVE), "bpcl");
        
        patterns.put(Pattern.compile(".*british.*petroleum.*", Pattern.CASE_INSENSITIVE), "bp");
        patterns.put(Pattern.compile(".*bp.*petrol.*", Pattern.CASE_INSENSITIVE), "bp");
        patterns.put(Pattern.compile(".*bp.*gas.*", Pattern.CASE_INSENSITIVE), "bp");
        patterns.put(Pattern.compile(".*bp.*fuel.*", Pattern.CASE_INSENSITIVE), "bp");
        
        patterns.put(Pattern.compile(".*shell.*", Pattern.CASE_INSENSITIVE), "shell");
        patterns.put(Pattern.compile(".*indian.*oil.*", Pattern.CASE_INSENSITIVE), "indian-oil");
        patterns.put(Pattern.compile(".*iocl.*", Pattern.CASE_INSENSITIVE), "indian-oil");
        patterns.put(Pattern.compile(".*reliance.*", Pattern.CASE_INSENSITIVE), "reliance");
        patterns.put(Pattern.compile(".*jio.*bp.*", Pattern.CASE_INSENSITIVE), "reliance");
        patterns.put(Pattern.compile(".*essar.*", Pattern.CASE_INSENSITIVE), "essar");
        patterns.put(Pattern.compile(".*nayara.*", Pattern.CASE_INSENSITIVE), "essar");
        patterns.put(Pattern.compile(".*total.*", Pattern.CASE_INSENSITIVE), "total");
        patterns.put(Pattern.compile(".*adani.*", Pattern.CASE_INSENSITIVE), "adani");
        patterns.put(Pattern.compile(".*gulf.*", Pattern.CASE_INSENSITIVE), "gulf");
        patterns.put(Pattern.compile(".*castrol.*", Pattern.CASE_INSENSITIVE), "castrol");
        
        return patterns;
    }

    /**
     * Get the brand logo URL for a fuel record
     * @param stationName the name of the fuel station
     * @param stationBrand the brand of the fuel station (if available)
     * @return the S3 URL of the brand logo
     */
    public String getBrandLogoUrl(String stationName, String stationBrand) {
        String detectedBrand = detectFuelBrand(stationName, stationBrand);
        return buildLogoUrl(detectedBrand);
    }

    /**
     * Detect the fuel brand based on station name and brand
     * @param stationName the station name
     * @param stationBrand the station brand
     * @return the detected brand key or "default" if no match
     */
    public String detectFuelBrand(String stationName, String stationBrand) {
        log.debug("Detecting fuel brand for station: '{}', brand: '{}'", stationName, stationBrand);

        // Priority 1: Check station brand first (more reliable)
        if (stationBrand != null && !stationBrand.trim().isEmpty()) {
            String brandFromBrand = matchBrand(stationBrand.toLowerCase().trim());
            if (brandFromBrand != null) {
                log.debug("Brand detected from stationBrand field: {}", brandFromBrand);
                return brandFromBrand;
            }
        }

        // Priority 2: Check station name patterns
        if (stationName != null && !stationName.trim().isEmpty()) {
            for (Map.Entry<Pattern, String> entry : stationNamePatterns.entrySet()) {
                if (entry.getKey().matcher(stationName).matches()) {
                    log.debug("Brand detected from stationName pattern: {}", entry.getValue());
                    return entry.getValue();
                }
            }

            // Priority 3: Check station name with brand mapping
            String brandFromName = matchBrand(stationName.toLowerCase().trim());
            if (brandFromName != null) {
                log.debug("Brand detected from stationName mapping: {}", brandFromName);
                return brandFromName;
            }
        }

        log.debug("No brand detected, using default logo");
        return "default";
    }

    /**
     * Match a text against brand patterns
     * @param text the text to match (should be lowercase)
     * @return the brand key if matched, null otherwise
     */
    private String matchBrand(String text) {
        for (Map.Entry<String, Set<String>> entry : brandPatterns.entrySet()) {
            String brandKey = entry.getKey();
            Set<String> patterns = entry.getValue();
            
            for (String pattern : patterns) {
                if (text.contains(pattern.toLowerCase()) || 
                    pattern.toLowerCase().contains(text) ||
                    levenshteinDistance(text, pattern.toLowerCase()) <= 2) {
                    return brandKey;
                }
            }
        }
        return null;
    }

    /**
     * Build the S3 URL for a brand logo
     * @param brandKey the brand key (e.g., "shell", "bp", "default")
     * @return the complete S3 URL for the brand logo
     */
    private String buildLogoUrl(String brandKey) {
        String bucketName = configProperties.getAwsFuelLogosBucketName();
        String region = configProperties.getAwsRegion();
        String fileName = brandKey + ".png"; // Assuming PNG format for all logos
        
        // Build S3 URL: https://fuel-company-logos.s3.region.amazonaws.com/brand.png
        String logoUrl = String.format("https://%s.s3.%s.amazonaws.com/%s", 
                                      bucketName, region, fileName);
        
        log.debug("Generated logo URL for brand '{}': {}", brandKey, logoUrl);
        return logoUrl;
    }

    /**
     * Calculate Levenshtein distance for fuzzy matching
     * @param s1 first string
     * @param s2 second string
     * @return the Levenshtein distance
     */
    private int levenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];

        for (int i = 0; i <= s1.length(); i++) {
            for (int j = 0; j <= s2.length(); j++) {
                if (i == 0) {
                    dp[i][j] = j;
                } else if (j == 0) {
                    dp[i][j] = i;
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j - 1] + (s1.charAt(i - 1) == s2.charAt(j - 1) ? 0 : 1),
                        Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1)
                    );
                }
            }
        }

        return dp[s1.length()][s2.length()];
    }

    /**
     * Get all supported fuel brands
     * @return a set of all supported brand keys
     */
    public Set<String> getSupportedBrands() {
        Set<String> brands = new HashSet<>(brandPatterns.keySet());
        brands.add("default");
        return brands;
    }

    /**
     * Add a new brand mapping (for dynamic brand addition)
     * @param brandKey the brand key
     * @param patterns the patterns to match for this brand
     */
    public void addBrandMapping(String brandKey, Set<String> patterns) {
        brandPatterns.put(brandKey, patterns);
        log.info("Added new brand mapping: {} -> {}", brandKey, patterns);
    }
}
