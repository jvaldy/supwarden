<?php

namespace App\Controller;

use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class HealthController
{
    #[OA\Get(
        path: '/api/health',
        summary: 'Vérifie que l’API répond.',
        tags: ['Santé']
    )]
    #[OA\Response(
        response: 200,
        description: 'État courant de l’API et de ses services principaux.',
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'application', type: 'string', example: 'supwarden'),
                new OA\Property(property: 'status', type: 'string', example: 'ok'),
                new OA\Property(
                    property: 'services',
                    properties: [
                        new OA\Property(property: 'api', type: 'string', example: 'up'),
                        new OA\Property(property: 'db', type: 'string', example: 'configured'),
                        new OA\Property(property: 'mercure', type: 'string', example: 'configured'),
                    ],
                    type: 'object'
                ),
            ],
            type: 'object'
        )
    )]
    #[Route('/api/health', name: 'api_health', methods: ['GET'])]
    public function __invoke(): JsonResponse
    {
        return new JsonResponse([
            'application' => 'supwarden',
            'status' => 'ok',
            'services' => [
                'api' => 'up',
                'db' => 'configured',
                'mercure' => 'configured',
            ],
        ]);
    }
}
