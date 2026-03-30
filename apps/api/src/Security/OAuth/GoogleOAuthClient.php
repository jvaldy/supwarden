<?php

namespace App\Security\OAuth;

use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class GoogleOAuthClient implements GoogleOAuthClientInterface
{
    private const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';
    private const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $clientId,
        private readonly string $clientSecret,
        private readonly string $redirectUri,
        private readonly string $frontendCallbackUrl
    ) {
    }

    public function buildAuthorizationUrl(string $state): string
    {
        return sprintf('%s?%s', self::AUTHORIZE_URL, http_build_query([
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
            'access_type' => 'online',
            'include_granted_scopes' => 'true',
            'prompt' => 'select_account',
        ]));
    }

    public function fetchIdentityFromAuthorizationCode(string $authorizationCode): OAuthProviderIdentity
    {
        try {
            $tokenResponse = $this->httpClient->request('POST', self::TOKEN_URL, [
                'body' => [
                    'code' => $authorizationCode,
                    'client_id' => $this->clientId,
                    'client_secret' => $this->clientSecret,
                    'redirect_uri' => $this->redirectUri,
                    'grant_type' => 'authorization_code',
                ],
            ])->toArray();

            $accessToken = (string) ($tokenResponse['access_token'] ?? '');

            if ($accessToken === '') {
                throw new \RuntimeException('Google n’a pas retourné de jeton d’accès exploitable.');
            }

            $identityResponse = $this->httpClient->request('GET', self::USERINFO_URL, [
                'headers' => [
                    'Authorization' => sprintf('Bearer %s', $accessToken),
                ],
            ])->toArray();
        } catch (ExceptionInterface $exception) {
            throw new \RuntimeException('Impossible de joindre Google pour finaliser la connexion.', 0, $exception);
        }

        $providerUserId = (string) ($identityResponse['sub'] ?? '');
        $email = (string) ($identityResponse['email'] ?? '');

        if ($providerUserId === '' || $email === '') {
            throw new \RuntimeException('Google n’a pas retourné une identité suffisante.');
        }

        return new OAuthProviderIdentity(
            providerUserId: $providerUserId,
            email: mb_strtolower(trim($email)),
            emailVerified: (bool) ($identityResponse['email_verified'] ?? false),
            firstname: isset($identityResponse['given_name']) ? trim((string) $identityResponse['given_name']) : null,
            lastname: isset($identityResponse['family_name']) ? trim((string) $identityResponse['family_name']) : null,
            avatarUrl: isset($identityResponse['picture']) ? trim((string) $identityResponse['picture']) : null
        );
    }

    public function buildFrontendRedirectUrl(array $parameters = []): string
    {
        $fragmentParameters = array_filter($parameters, static fn ($value) => $value !== null && $value !== '');

        if ($fragmentParameters === []) {
            return $this->frontendCallbackUrl;
        }

        return sprintf('%s#%s', $this->frontendCallbackUrl, http_build_query($fragmentParameters));
    }
}