<?php

namespace App\Security;

use App\Entity\User;

class BearerTokenManager
{
    public function __construct(
        private readonly string $appSecret,
        private readonly int $tokenTtl
    ) {
    }

    public function create(User $user): string
    {
        // Jeton signé léger pour une API stateless, sans dépendance JWT externe.
        $tokenPayload = [
            'sub' => $user->getId(),
            'iat' => time(),
            'exp' => time() + $this->tokenTtl,
        ];

        $encodedPayload = $this->base64UrlEncode(json_encode($tokenPayload, JSON_THROW_ON_ERROR));
        $encodedSignature = $this->sign($encodedPayload);

        return sprintf('%s.%s', $encodedPayload, $encodedSignature);
    }

    /**
     * @return array{sub:int,iat:int,exp:int}|null
     */
    public function parse(string $token): ?array
    {
        $tokenParts = explode('.', $token);

        if (count($tokenParts) !== 2) {
            return null;
        }

        [$encodedPayload, $providedSignature] = $tokenParts;
        $expectedSignature = $this->sign($encodedPayload);

        if (!hash_equals($expectedSignature, $providedSignature)) {
            return null;
        }

        // Le jeton est rejeté si sa signature ou sa date d'expiration ne correspondent pas.
        $decodedPayload = json_decode($this->base64UrlDecode($encodedPayload), true);

        if (
            !is_array($decodedPayload)
            || !isset($decodedPayload['sub'], $decodedPayload['iat'], $decodedPayload['exp'])
        ) {
            return null;
        }

        if ((int) $decodedPayload['exp'] < time()) {
            return null;
        }

        return [
            'sub' => (int) $decodedPayload['sub'],
            'iat' => (int) $decodedPayload['iat'],
            'exp' => (int) $decodedPayload['exp'],
        ];
    }

    private function sign(string $encodedPayload): string
    {
        return $this->base64UrlEncode(hash_hmac('sha256', $encodedPayload, $this->appSecret, true));
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        $missingPaddingLength = strlen($value) % 4;

        if ($missingPaddingLength > 0) {
            $value .= str_repeat('=', 4 - $missingPaddingLength);
        }

        return base64_decode(strtr($value, '-_', '+/'), true) ?: '';
    }
}
