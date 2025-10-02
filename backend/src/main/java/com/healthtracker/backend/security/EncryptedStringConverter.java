package com.healthtracker.backend.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.spec.KeySpec;
import java.util.Base64;

/**
 * Enhanced JPA AttributeConverter for encrypting/decrypting sensitive PHI data.
 *
 * <p><b>Security Enhancements from Code Review:</b>
 * <ul>
 *   <li>✅ Uses PBKDF2WithHmacSHA256 for key derivation (was simple truncation)</li>
 *   <li>✅ 100,000 iterations (NIST SP 800-132 recommendation)</li>
 *   <li>✅ Unique salt per deployment via configuration</li>
 *   <li>✅ AES-256-GCM for authenticated encryption</li>
 *   <li>✅ Random IV per encryption operation</li>
 *   <li>✅ Prevents tampering via GCM authentication tag</li>
 * </ul>
 *
 * <p><b>HIPAA Compliance:</b>
 * <ul>
 *   <li>AES-256 encryption for PHI at rest</li>
 *   <li>Authenticated encryption prevents tampering</li>
 *   <li>Key derivation strengthens security</li>
 *   <li>Error logging for audit trail (without exposing data)</li>
 * </ul>
 *
 * <p><b>Algorithm Details:</b>
 * <pre>
 * Key Derivation: PBKDF2WithHmacSHA256
 *   - Input: Encryption secret + salt
 *   - Iterations: 100,000 (NIST recommendation)
 *   - Output: 256-bit key
 *
 * Encryption: AES-256-GCM
 *   - Mode: Galois/Counter Mode (authenticated encryption)
 *   - IV: 96 bits (random per encryption)
 *   - Tag: 128 bits (authentication tag)
 *   - Key: 256 bits (derived via PBKDF2)
 *
 * Storage Format: Base64(IV || ciphertext || tag)
 * </pre>
 *
 * <p><b>Performance Considerations:</b>
 * <ul>
 *   <li>Key derivation is expensive (100K iterations) but cached</li>
 *   <li>First encryption/decryption triggers key derivation</li>
 *   <li>Subsequent operations use cached key (fast)</li>
 *   <li>~10ms overhead per operation (acceptable for PHI)</li>
 * </ul>
 *
 * @author Health Tracker Security Team
 * @see <a href="https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf">NIST SP 800-132</a>
 */
@Converter
@Component
@Slf4j
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    // Encryption algorithm constants
    private static final String ENCRYPTION_ALGORITHM = "AES/GCM/NoPadding";
    private static final String KEY_DERIVATION_ALGORITHM = "PBKDF2WithHmacSHA256";
    private static final int GCM_IV_LENGTH = 12;  // 96 bits (NIST recommendation for GCM)
    private static final int GCM_TAG_LENGTH = 128;  // 128 bits (standard GCM tag)
    private static final int KEY_LENGTH = 256;  // 256 bits for AES-256
    private static final int PBKDF2_ITERATIONS = 100000;  // NIST SP 800-132 recommendation

    @Value("${encryption.secret}")
    private String encryptionSecret;

    @Value("${encryption.salt}")
    private String encryptionSalt;

    // Cached derived key (computed once, reused for performance)
    private volatile SecretKey cachedKey = null;
    private final Object keyLock = new Object();

    /**
     * Converts entity attribute to database column (encryption).
     *
     * <p>Encrypts sensitive PHI data before storing in database.
     * Uses AES-256-GCM with random IV for each encryption.
     *
     * @param attribute plaintext string to encrypt (PHI data)
     * @return Base64-encoded encrypted data with IV
     * @throws RuntimeException if encryption fails
     */
    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return attribute;
        }

        try {
            SecretKey key = getDerivedKey();
            Cipher cipher = Cipher.getInstance(ENCRYPTION_ALGORITHM);

            // Generate random IV for this encryption (CRITICAL for security)
            byte[] iv = new byte[GCM_IV_LENGTH];
            SecureRandom.getInstanceStrong().nextBytes(iv);

            // Initialize cipher with GCM parameters
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, key, gcmSpec);

            // Encrypt data (includes authentication tag)
            byte[] encryptedData = cipher.doFinal(attribute.getBytes(StandardCharsets.UTF_8));

            // Combine IV + ciphertext + tag
            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + encryptedData.length);
            byteBuffer.put(iv);
            byteBuffer.put(encryptedData);

            // Return Base64 encoded result
            return Base64.getEncoder().encodeToString(byteBuffer.array());

        } catch (Exception e) {
            log.error("PHI encryption failed: {}", e.getMessage());
            throw new RuntimeException("Failed to encrypt sensitive data", e);
        }
    }

    /**
     * Converts database column to entity attribute (decryption).
     *
     * <p>Decrypts PHI data when loading from database.
     * GCM mode verifies authentication tag to detect tampering.
     *
     * @param dbData Base64-encoded encrypted data from database
     * @return decrypted plaintext string
     * @throws RuntimeException if decryption or authentication fails
     */
    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return dbData;
        }

        try {
            SecretKey key = getDerivedKey();
            Cipher cipher = Cipher.getInstance(ENCRYPTION_ALGORITHM);

            // Decode Base64
            byte[] decoded = Base64.getDecoder().decode(dbData);

            // Extract IV and encrypted data
            ByteBuffer byteBuffer = ByteBuffer.wrap(decoded);
            byte[] iv = new byte[GCM_IV_LENGTH];
            byteBuffer.get(iv);
            byte[] encryptedData = new byte[byteBuffer.remaining()];
            byteBuffer.get(encryptedData);

            // Initialize cipher for decryption
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, key, gcmSpec);

            // Decrypt and verify authentication tag
            // Will throw exception if data was tampered with
            byte[] decryptedData = cipher.doFinal(encryptedData);

            return new String(decryptedData, StandardCharsets.UTF_8);

        } catch (Exception e) {
            log.error("PHI decryption failed: {} - Possible data tampering or corruption",
                     e.getMessage());
            throw new RuntimeException("Failed to decrypt sensitive data", e);
        }
    }

    /**
     * Derives encryption key using PBKDF2WithHmacSHA256.
     *
     * <p><b>Key Derivation Process:</b>
     * <ol>
     *   <li>Takes encryption secret + salt as input</li>
     *   <li>Applies PBKDF2 with 100,000 iterations</li>
     *   <li>Produces 256-bit key for AES-256</li>
     *   <li>Caches result for performance</li>
     * </ol>
     *
     * <p><b>Security Rationale:</b>
     * PBKDF2 with high iteration count makes brute-force attacks computationally
     * expensive. Even if database is compromised, deriving the key from the secret
     * requires significant computational resources.
     *
     * <p><b>Performance Note:</b>
     * Key derivation is expensive (~100ms) but only happens once per application
     * lifecycle. The derived key is cached for subsequent operations.
     *
     * @return 256-bit AES key derived from secret and salt
     * @throws RuntimeException if key derivation fails
     */
    private SecretKey getDerivedKey() {
        // Double-checked locking for thread-safe lazy initialization
        if (cachedKey == null) {
            synchronized (keyLock) {
                if (cachedKey == null) {
                    try {
                        log.debug("Deriving encryption key using PBKDF2 (100K iterations)...");
                        long startTime = System.currentTimeMillis();

                        // Create key specification for PBKDF2
                        KeySpec spec = new PBEKeySpec(
                            encryptionSecret.toCharArray(),
                            encryptionSalt.getBytes(StandardCharsets.UTF_8),
                            PBKDF2_ITERATIONS,
                            KEY_LENGTH
                        );

                        // Derive key using PBKDF2WithHmacSHA256
                        SecretKeyFactory factory = SecretKeyFactory.getInstance(KEY_DERIVATION_ALGORITHM);
                        byte[] derivedKeyBytes = factory.generateSecret(spec).getEncoded();

                        // Create AES key from derived bytes
                        cachedKey = new SecretKeySpec(derivedKeyBytes, "AES");

                        long duration = System.currentTimeMillis() - startTime;
                        log.info("✅ Encryption key derived successfully in {}ms (PBKDF2, 100K iterations)",
                                duration);

                        // Clear sensitive data from memory
                        spec.clearPassword();

                    } catch (Exception e) {
                        log.error("❌ Key derivation failed: {}", e.getMessage());
                        throw new RuntimeException("Failed to derive encryption key", e);
                    }
                }
            }
        }
        return cachedKey;
    }

    /**
     * Clears the cached encryption key from memory.
     *
     * <p>Should be called when:
     * <ul>
     *   <li>Application is shutting down</li>
     *   <li>Encryption configuration changes</li>
     *   <li>Security incident requires key rotation</li>
     * </ul>
     *
     * <p>Next encryption/decryption will trigger key re-derivation.
     */
    public void clearCachedKey() {
        synchronized (keyLock) {
            cachedKey = null;
            log.info("Encryption key cache cleared - will re-derive on next use");
        }
    }
}
