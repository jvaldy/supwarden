<?php

namespace App\Security\OAuth;

interface GoogleOAuthClientInterface
{
    public function buildAuthorizationUrl(string $state): string;

    public function fetchIdentityFromAuthorizationCode(string $authorizationCode): OAuthProviderIdentity;

    /**
     * @param array<string, scalar|null> $parameters
     */
    public function buildFrontendRedirectUrl(array $parameters = []): string;
}