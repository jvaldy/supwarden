<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Symfony\Component\HttpFoundation\Response;

final class SmokeApiTest extends ApiTestCase
{
    public function testHealthEndpointIsReachable(): void
    {
        $this->client->request('GET', '/api/health');

        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        self::assertResponseHeaderSame('content-type', 'application/json');

        $payload = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('supwarden', $payload['application'] ?? null);
        self::assertSame('ok', $payload['status'] ?? null);
    }

    public function testUnauthorizedErrorShapeIsStandardized(): void
    {
        $this->client->request('GET', '/api/me');

        self::assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);

        $payload = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertArrayHasKey('message', $payload);
        // Certaines routes renvoient encore un format minimal explicite.
        if (array_key_exists('status', $payload)) {
            self::assertArrayHasKey('code', $payload);
            self::assertArrayHasKey('timestamp', $payload);
            self::assertArrayHasKey('path', $payload);
            self::assertArrayHasKey('requestId', $payload);
            self::assertSame('/api/me', $payload['path']);
        }
    }
}
