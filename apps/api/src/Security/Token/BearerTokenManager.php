<?php

namespace App\Security\Token;

use App\Entity\User;

class BearerTokenManager
{
    public function __construct(
        private readonly string $appSecret,
        private readonly int $tokenTtl
    ) {
    }

    // Construit un jeton signé léger à partir de l’utilisateur courant.
    public function create(User $user): string
    {
        // Jeton signé simple, suffisant pour l’API sans dépendance JWT supplémentaire.
        $tokenPayload = [
            'sub' => $user->getId(),
            'iat' => time(),
            'exp' => time() + $this->tokenTtl,
            'version' => $user->getAuthTokenVersion(),
        ];

        $encodedPayload = $this->base64UrlEncode(json_encode($tokenPayload, JSON_THROW_ON_ERROR));
        $encodedSignature = $this->sign($encodedPayload);

        return sprintf('%s.%s', $encodedPayload, $encodedSignature);
    }

    /**
     * @return array{sub:int,iat:int,exp:int,version:int}|null
     */
    // Valide le format, la signature et l’échéance avant de renvoyer le payload utile.
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

        // Refuse tout jeton incomplet, altéré ou expiré.
        $decodedPayload = json_decode($this->base64UrlDecode($encodedPayload), true);

        if (
            !is_array($decodedPayload)
            || !isset($decodedPayload['sub'], $decodedPayload['iat'], $decodedPayload['exp'], $decodedPayload['version'])
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
            'version' => (int) $decodedPayload['version'],
        ];
    }

    // Signe le payload encodé avec le secret applicatif.
    private function sign(string $encodedPayload): string
    {
        return $this->base64UrlEncode(hash_hmac('sha256', $encodedPayload, $this->appSecret, true));
    }

    // Produit une chaîne compatible URL pour le transport du jeton.
    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    // Restaure un contenu encodé en base64url vers sa forme décodable.
    private function base64UrlDecode(string $value): string
    {
        $missingPaddingLength = strlen($value) % 4;

        if ($missingPaddingLength > 0) {
            $value .= str_repeat('=', 4 - $missingPaddingLength);
        }

        return base64_decode(strtr($value, '-_', '+/'), true) ?: '';
    }
}
