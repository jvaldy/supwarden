<?php

declare(strict_types=1);

namespace App\Service;

final class VaultSecretCipher
{
    private const PREFIX = 'enc:v1:';

    private string $encryptionKey;

    public function __construct(string $appSecret)
    {
        $this->encryptionKey = hash('sha256', $appSecret, true);
    }

    public function encrypt(?string $value): ?string
    {
        $normalizedValue = $value !== null ? trim($value) : null;

        if ($normalizedValue === null || $normalizedValue === '') {
            return null;
        }

        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $cipherText = sodium_crypto_secretbox($normalizedValue, $nonce, $this->encryptionKey);

        return self::PREFIX.base64_encode($nonce.$cipherText);
    }

    public function decrypt(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        // Compatibilite legacy: les anciennes lignes en clair restent lisibles.
        if (!str_starts_with($value, self::PREFIX)) {
            return $value;
        }

        $payload = substr($value, strlen(self::PREFIX));
        $decoded = base64_decode($payload, true);

        if (!is_string($decoded) || strlen($decoded) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES) {
            return null;
        }

        $nonce = substr($decoded, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $cipherText = substr($decoded, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $plainText = sodium_crypto_secretbox_open($cipherText, $nonce, $this->encryptionKey);

        return is_string($plainText) ? $plainText : null;
    }
}
