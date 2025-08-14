package com.sweetpotato.service;

import com.sweetpotato.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
@Slf4j
public class JwtService {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration}")
    private long jwtExpiration;

    @Value("${app.jwt.refresh-expiration}")
    private long refreshExpiration;

    // This method extracts the subject from JWT token, which is now the user's email
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return buildToken(extraClaims, userDetails, jwtExpiration);
    }

    public String generateRefreshToken(UserDetails userDetails) {
        return buildToken(new HashMap<>(), userDetails, refreshExpiration);
    }

    private String buildToken(
            Map<String, Object> extraClaims,
            UserDetails userDetails,
            long expiration
    ) {
        // Cast to User to access the email field
        String subject;
        if (userDetails instanceof User) {
            subject = ((User) userDetails).getEmail();
        } else {
            subject = userDetails.getUsername();
        }
        
        return Jwts
                .builder()
                .setClaims(extraClaims)
                .setSubject(subject)  // Now using email as subject
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String extractedEmail = extractUsername(token);
            log.debug("JWT Validation - Extracted email from token: '{}'", extractedEmail);
            
            // Compare with email instead of username
            String userEmail;
            if (userDetails instanceof User) {
                userEmail = ((User) userDetails).getEmail();
                log.debug("JWT Validation - User email from UserDetails: '{}'", userEmail);
            } else {
                userEmail = extractedEmail; // fallback
                log.debug("JWT Validation - Using fallback email: '{}'", userEmail);
            }
            
            boolean emailsMatch = extractedEmail.equals(userEmail);
            boolean isNotExpired = !isTokenExpired(token);
            
            log.debug("JWT Validation - Emails match: {}, Token not expired: {}", emailsMatch, isNotExpired);
            
            boolean isValid = emailsMatch && isNotExpired;
            log.debug("JWT Validation - Final result: {}", isValid);
            
            return isValid;
        } catch (Exception e) {
            log.error("JWT Validation - Error during token validation: {}", e.getMessage(), e);
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        try {
            log.debug("JWT Parsing - Token length: {}, starts with: {}...", token.length(), token.substring(0, Math.min(20, token.length())));
            Claims claims = Jwts
                    .parserBuilder()
                    .setSigningKey(getSignInKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            log.debug("JWT Parsing - Successfully parsed claims, subject: {}", claims.getSubject());
            return claims;
        } catch (Exception e) {
            log.error("JWT token parsing failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public long getJwtExpiration() {
        return jwtExpiration;
    }

    public long getRefreshExpiration() {
        return refreshExpiration;
    }
}
