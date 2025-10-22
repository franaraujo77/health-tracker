package com.healthtracker.backend.dto.observability;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * DTO representing an AlertManager webhook payload.
 * Supports AlertManager v0.25+ webhook format.
 *
 * @see <a href="https://prometheus.io/docs/alerting/latest/configuration/#webhook_config">AlertManager Webhook</a>
 */
@Data
public class AlertManagerWebhook {

    private String receiver;
    private String status; // "firing" or "resolved"
    private List<Alert> alerts;
    private Map<String, String> groupLabels;
    private Map<String, String> commonLabels;
    private Map<String, String> commonAnnotations;
    private String externalURL;
    private String version;
    private String groupKey;
    private Long truncatedAlerts;

    @Data
    public static class Alert {
        private String status;
        private Map<String, String> labels;
        private Map<String, String> annotations;

        @JsonProperty("startsAt")
        private Instant startsAt;

        @JsonProperty("endsAt")
        private Instant endsAt;

        @JsonProperty("generatorURL")
        private String generatorURL;

        private String fingerprint;

        /**
         * Get alert name from labels
         */
        public String getAlertName() {
            return labels != null ? labels.get("alertname") : null;
        }

        /**
         * Get severity from labels
         */
        public String getSeverity() {
            return labels != null ? labels.get("severity") : "unknown";
        }

        /**
         * Get workflow name from labels if present
         */
        public String getWorkflowName() {
            return labels != null ? labels.get("workflow") : null;
        }

        /**
         * Get error message from annotations
         */
        public String getErrorMessage() {
            return annotations != null ? annotations.get("description") : null;
        }
    }
}
