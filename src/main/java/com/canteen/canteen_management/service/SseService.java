package com.canteen.canteen_management.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class SseService {

    // Store active SSE connections per user
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter createEmitter(Long userId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        emitter.onCompletion(() -> {
            log.info("SSE completed for user: {}", userId);
            emitters.remove(userId);
        });

        emitter.onTimeout(() -> {
            log.info("SSE timeout for user: {}", userId);
            emitters.remove(userId);
        });

        emitter.onError((e) -> {
            log.error("SSE error for user: {}", userId, e);
            emitters.remove(userId);
        });

        emitters.put(userId, emitter);
        log.info("SSE emitter created for user: {}", userId);

        // Send initial connection message
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("Connection established"));
        } catch (IOException e) {
            log.error("Error sending initial message", e);
        }

        return emitter;
    }

    public void sendNotification(Long userId, String eventName, String message) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(message));
                log.info("Notification sent to user {}: {}", userId, message);
            } catch (IOException e) {
                log.error("Failed to send notification to user {}", userId, e);
                emitters.remove(userId);
            }
        } else {
            log.warn("No active SSE connection for user: {}", userId);
        }
    }

    public void removeEmitter(Long userId) {
        emitters.remove(userId);
        log.info("SSE emitter removed for user: {}", userId);
    }
}