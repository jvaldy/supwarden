<?php

namespace App\Security\OAuth;

final class OAuthProviderIdentity
{
    public function __construct(
        public readonly string $providerUserId,
        public readonly string $email,
        public readonly bool $emailVerified,
        public readonly ?string $firstname,
        public readonly ?string $lastname,
        public readonly ?string $avatarUrl
    ) {
    }
}
