<?php

namespace App\Controller\Admin;

use App\Repository\UserRepository;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

final class UserAdminController extends AbstractController
{
    #[OA\Get(
        path: '/api/admin/users',
        summary: 'Liste les utilisateurs pour les administrateurs.',
        security: [['Bearer' => []]],
        tags: ['Administration']
    )]
    #[OA\Response(response: 200, description: "Liste des utilisateurs disponibles pour l'administration.")]
    #[OA\Response(response: 403, description: 'Accès réservé aux administrateurs.')]
    #[IsGranted('ROLE_ADMIN')]
    #[Route('/api/admin/users', name: 'api_admin_users', methods: ['GET'])]
    public function __invoke(UserRepository $userRepository, NormalizerInterface $normalizer): JsonResponse
    {
        $users = $userRepository->findAllOrderedByCreationDateDesc();

        return $this->json([
            'users' => $normalizer->normalize($users, null, ['groups' => ['user:read']]),
        ]);
    }
}

