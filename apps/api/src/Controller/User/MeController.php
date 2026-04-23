<?php

declare(strict_types=1);

namespace App\Controller\User;

use App\Entity\User;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

final class MeController extends AbstractController
{
    #[OA\Get(
        path: '/api/me',
        summary: "Retourne l'utilisateur authentifié.",
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
            return $this->jsonError('Authentification requise.', Response::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'user' => $normalizer->normalize($authenticatedUser, null, ['groups' => ['user:read']]),
        ]);
    }

    #[Route('/api/me/verify-pin', name: 'api_me_verify_pin', methods: ['POST'])]
    public function verifyPin(
        Request $request,
        #[CurrentUser] ?User $authenticatedUser
    ): JsonResponse {
        if ($authenticatedUser === null) {
            return $this->jsonError('Authentification requise.', Response::HTTP_UNAUTHORIZED);
        }

        $requestData = $this->decodeJsonObject($request);
        if ($requestData instanceof JsonResponse) {
            return $requestData;
        }

        $pin = isset($requestData['pin']) ? trim((string) $requestData['pin']) : '';
        if ($pin === '') {
            return $this->jsonError('Le code PIN est requis.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (!$authenticatedUser->hasPin() || !is_string($authenticatedUser->getPinHash())) {
            return $this->jsonError("Vous n'avez pas encore défini votre code PIN.", Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (!password_verify($pin, $authenticatedUser->getPinHash())) {
            return $this->jsonError('Le code PIN est incorrect.', Response::HTTP_UNAUTHORIZED);
        }

        return $this->json(['message' => 'PIN valide.']);
    }

    /**
     * @return array<string, mixed>|JsonResponse
     */
    private function decodeJsonObject(Request $request): array|JsonResponse
    {
        $rawContent = $request->getContent();

        if ($rawContent === '') {
            return $this->jsonError('Le corps de la requête JSON est requis.', Response::HTTP_BAD_REQUEST);
        }

        try {
            $decoded = json_decode($rawContent, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->jsonError('Le JSON fourni est invalide.', Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($decoded)) {
            return $this->jsonError('Le corps de la requête doit être un objet JSON.', Response::HTTP_BAD_REQUEST);
        }

        return $decoded;
    }

    private function jsonError(string $message, int $status): JsonResponse
    {
        return $this->json(['message' => $message], $status);
    }
}

