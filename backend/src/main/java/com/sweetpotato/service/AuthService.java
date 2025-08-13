package com.sweetpotato.service;

import com.sweetpotato.dto.auth.AuthResponse;
import com.sweetpotato.dto.auth.LoginRequest;
import com.sweetpotato.dto.auth.RegisterRequest;
import com.sweetpotato.dto.user.UserResponse;
import com.sweetpotato.entity.User;
import com.sweetpotato.exception.EmailAlreadyExistsException;
import com.sweetpotato.exception.InvalidCredentialsException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        log.info("Attempting to register user with email: {}", request.getEmail());

        // Check if user already exists
        if (userService.existsByEmail(request.getEmail())) {
            log.warn("Registration failed: Email already exists - {}", request.getEmail());
            throw new EmailAlreadyExistsException("Email already exists: " + request.getEmail());
        }

        // Create new user
        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .isActive(true)
                .build();

        User savedUser = userService.save(user);
        log.info("User registered successfully with email: {}", savedUser.getEmail());

        // Generate tokens
        String jwtToken = jwtService.generateToken(savedUser);
        String refreshToken = jwtService.generateRefreshToken(savedUser);

        return AuthResponse.builder()
                .token(jwtToken)
                .refreshToken(refreshToken)
                .user(mapToUserResponse(savedUser))
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        log.info("Attempting to login user with email: {}", request.getEmail());

        try {
            // Authenticate the user
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(),
                            request.getPassword()
                    )
            );
        } catch (BadCredentialsException e) {
            log.warn("Login failed: Invalid credentials for email - {}", request.getEmail());
            throw new InvalidCredentialsException("Invalid email or password");
        }

        // Get the user
        User user = userService.findByEmail(request.getEmail())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        log.info("User logged in successfully with email: {}", user.getEmail());

        // Generate tokens
        String jwtToken = jwtService.generateToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return AuthResponse.builder()
                .token(jwtToken)
                .refreshToken(refreshToken)
                .user(mapToUserResponse(user))
                .build();
    }

    @Transactional(readOnly = true)
    public String refreshToken(String refreshToken) {
        log.debug("Attempting to refresh token");

        // Extract username from refresh token
        String userEmail = jwtService.extractUsername(refreshToken);
        
        if (userEmail != null) {
            User user = userService.findByEmail(userEmail)
                    .orElseThrow(() -> new InvalidCredentialsException("Invalid refresh token"));

            // Validate refresh token
            if (jwtService.isTokenValid(refreshToken, user)) {
                log.debug("Refresh token is valid, generating new access token");
                return jwtService.generateToken(user);
            }
        }
        
        log.warn("Invalid refresh token provided");
        throw new InvalidCredentialsException("Invalid refresh token");
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .createdAt(user.getCreatedAt())
                .isActive(user.getIsActive())
                .build();
    }
}
