<?php

declare(strict_types=1);

namespace App\Controller\Tools;

use App\Entity\User;
use App\Service\UserStatsService;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/tools', name: 'api_tools_stats_')]
final class StatsController extends AbstractController
{
    #[OA\Get(
        path: '/api/tools/stats',
        summary: "Retourne les statistiques d'usage de l'utilisateur.",
        security: [['Bearer' => []]],
        tags: ['Outils avances']
    )]
    #[Route('/stats', name: 'user_stats', methods: ['GET'])]
    public function stats(#[CurrentUser] ?User $authenticatedUser, UserStatsService $userStatsService): JsonResponse
    {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'stats' => $userStatsService->buildUserStats($authenticatedUser),
        ]);
    }
}
