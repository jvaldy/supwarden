<?php

declare(strict_types=1);

namespace App\Controller\Notification;

use App\Entity\User;
use App\Service\Notification\NotificationSnapshotBuilder;
use App\Service\Notification\NotificationTopicResolver;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/notifications', name: 'api_notifications_')]
final class NotificationController extends AbstractController
{
    public function __construct(
        private readonly NotificationSnapshotBuilder $snapshotBuilder,
        private readonly NotificationTopicResolver $topicResolver,
        private readonly string $mercurePublicUrl,
    ) {
    }

    #[OA\Get(
        path: '/api/notifications/stream-config',
        summary: 'Retourne la configuration Mercure des notifications.',
        security: [['Bearer' => []]],
        tags: ['Notifications']
    )]
    #[Route('/stream-config', name: 'stream_config', methods: ['GET'])]
    public function streamConfig(#[CurrentUser] ?User $authenticatedUser): JsonResponse
    {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'hubUrl' => $this->mercurePublicUrl,
            'topic' => $this->topicResolver->resolveUserTopic($authenticatedUser),
            'counts' => $this->snapshotBuilder->buildForUser($authenticatedUser),
        ]);
    }
}
