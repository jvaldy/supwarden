<?php

declare(strict_types=1);

namespace App\Service\Notification;

use App\Entity\User;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class NotificationMercurePublisher
{
    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly NotificationSnapshotBuilder $snapshotBuilder,
        private readonly NotificationTopicResolver $topicResolver,
        private readonly string $mercureUrl,
        private readonly string $mercureJwtSecret,
    ) {
    }

    public function publishForUser(User $user): void
    {
        if (!$this->isMercurePublishConfigured()) {
            return;
        }

        $payload = [
            'type' => 'notifications.updated',
            'counts' => $this->snapshotBuilder->buildForUser($user),
        ];

        try {
            $response = $this->httpClient->request('POST', $this->mercureUrl, [
                'headers' => [
                    'Authorization' => sprintf('Bearer %s', $this->createPublisherJwt()),
                ],
                'body' => [
                    'topic' => $this->topicResolver->resolveUserTopic($user),
                    'data' => json_encode($payload, JSON_THROW_ON_ERROR),
                    'private' => 'off',
                ],
                'timeout' => 2.0,
            ]);

            $response->getStatusCode();
        } catch (\Throwable) {
            // Les notifications temps reel ne doivent jamais bloquer le coeur des actions metier.
        }
    }

    private function isMercurePublishConfigured(): bool
    {
        if ($this->mercureUrl === '' || $this->mercureJwtSecret === '') {
            return false;
        }

        if (str_contains($this->mercureUrl, '${') || str_contains($this->mercureJwtSecret, '${')) {
            return false;
        }

        return filter_var($this->mercureUrl, FILTER_VALIDATE_URL) !== false;
    }

    private function createPublisherJwt(): string
    {
        $header = $this->base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $payload = $this->base64UrlEncode(json_encode([
            'mercure' => [
                'publish' => ['*'],
            ],
            'exp' => time() + 3600,
        ], JSON_THROW_ON_ERROR));

        $signature = hash_hmac('sha256', sprintf('%s.%s', $header, $payload), $this->mercureJwtSecret, true);

        return sprintf('%s.%s.%s', $header, $payload, $this->base64UrlEncode($signature));
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
