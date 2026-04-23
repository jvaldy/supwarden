<?php

declare(strict_types=1);

namespace App\Controller\Tools;

use App\Entity\User;
use App\Service\PasswordGeneratorService;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/tools', name: 'api_tools_password_')]
final class PasswordGeneratorController extends AbstractController
{
    #[OA\Post(
        path: '/api/tools/password/generate',
        summary: 'Genere un mot de passe securise.',
        security: [['Bearer' => []]],
        tags: ['Outils avances']
    )]
    #[Route('/password/generate', name: 'generate_password', methods: ['POST'])]
    public function generate(
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        PasswordGeneratorService $passwordGeneratorService
    ): JsonResponse {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        if (!is_array($payload)) {
            $payload = [];
        }

        try {
            $password = $passwordGeneratorService->generate($payload);
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['message' => $exception->getMessage()], 422);
        }

        return $this->json([
            'password' => $password,
        ]);
    }
}
