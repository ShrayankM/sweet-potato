package com.sweetpotato.dto.auth;

import com.sweetpotato.dto.user.UserResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    
    private String token;
    private String refreshToken;
    private UserResponse user;
    @Builder.Default
    private String tokenType = "Bearer";
}
