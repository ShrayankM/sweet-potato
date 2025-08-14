package com.sweetpotato.dto.fuel;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MistralOcrRequest {
    
    private String model;
    private List<Message> messages;
    
    @JsonProperty("max_tokens")
    private Integer maxTokens;
    
    private Double temperature;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Message {
        private String role;
        private List<Content> content;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)  // Exclude null fields from JSON
    public static class Content {
        private String type;
        
        // Only include the relevant field based on type
        private String text;  // Only for type="text"
        
        @JsonProperty("image_url")
        private String imageUrl;  // Only for type="image_url"
        
        // Constructor helpers for specific types
        public static Content text(String text) {
            return Content.builder()
                    .type("text")
                    .text(text)
                    .build();
        }
        
        public static Content imageUrl(String imageUrl) {
            return Content.builder()
                    .type("image_url")
                    .imageUrl(imageUrl)
                    .build();
        }
    }
}
