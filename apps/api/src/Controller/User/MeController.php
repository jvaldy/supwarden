<?php

namespace App\Controller\User;

use App\Entity\User;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

final class MeController extends AbstractController
{
    #[OA\Get(
        path: '/api/me',
        summary: 'Retourne l’utilisateur authentifié.',
        security: [['Bearer' => []]],
        tags: ['Utilisateur']
    )]
    #[OA\Response(
        response: 200,
        description: 'Utilisateur courant.',
        content: new OA\JsonContent(
            properties: [
                new OA\Property(
                    property: 'user',
                    properties: [
                        new OA\Property(property: 'id', type: 'integer', example: 1),
                        new OA\Property(property: 'email', type: 'string', format: 'email', example: 'alice@example.com'),
                        new OA\Property(property: 'createdAt', type: 'string', format: 'date-time'),
                        new OA\Property(property: 'firstname', type: 'string', nullable: true, example: 'Alice'),
                        new OA\Property(property: 'lastname', type: 'string', nullable: true, example: 'Martin'),
                        new OA\Property(property: 'isActive', type: 'boolean', example: true),
                    ],
                    type: 'object'
                ),
            ],
            type: 'object'
        )
    )]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[Route('/api/me', name: 'api_me', methods: ['GET'])]
    public function __invoke(
        #[CurrentUser] ?User $authenticatedUser,
        NormalizerInterface $normalizer
    ): JsonResponse {
        if ($authenticatedUser === null) {
            return $this->json([
                'message' => 'Authentification requise.',
            ], JsonResponse::HTTP_UNAUTHORIZED);
        }

        // Retourne uniquement les champs exposables définis dans le groupe user:read.
        return $this->json([
            'user' => $normalizer->normalize($authenticatedUser, null, ['groups' => ['user:read']]),
        ]);
    }
}
