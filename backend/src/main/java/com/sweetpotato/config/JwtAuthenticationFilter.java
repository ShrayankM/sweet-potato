package com.sweetpotato.config;

import com.sweetpotato.service.JwtService;
import com.sweetpotato.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserService userService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        // Check if Authorization header is present and starts with Bearer
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("No Authorization header or doesn't start with Bearer. Header: {}", authHeader);
            filterChain.doFilter(request, response);
            return;
        }

        // Extract JWT token from Authorization header
        jwt = authHeader.substring(7);
        log.debug("Extracted JWT token (length {}): {}...", jwt.length(), jwt.substring(0, Math.min(jwt.length(), 20)));
        
        try {
            userEmail = jwtService.extractUsername(jwt);
            log.debug("Extracted user email from JWT: {}", userEmail);
        } catch (Exception e) {
            log.error("Error extracting username from JWT token: {}", e.getMessage(), e);
            filterChain.doFilter(request, response);
            return;
        }

        // If user email is extracted and no authentication is set in context
        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            log.debug("Attempting to authenticate user: {}", userEmail);
            try {
                UserDetails userDetails = userService.loadUserByUsername(userEmail);
                log.debug("Found user details for: {}", userEmail);

                // If token is valid, set authentication in context
                log.debug("Validating JWT token for user: {}", userEmail);
                boolean isTokenValid = jwtService.isTokenValid(jwt, userDetails);
                log.debug("Token validation result: {}", isTokenValid);
                
                if (isTokenValid) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.info("User authenticated successfully: {}", userEmail);
                } else {
                    log.warn("JWT token is not valid for user: {}", userEmail);
                }
            } catch (Exception e) {
                log.error("Error authenticating user from JWT token: {}", e.getMessage(), e);
            }
        } else if (userEmail == null) {
            log.debug("User email is null from JWT token");
        } else {
            log.debug("Authentication already exists in SecurityContext");
        }

        filterChain.doFilter(request, response);
    }
}
