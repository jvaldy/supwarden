<?php

declare(strict_types=1);

namespace App\Controller\Messaging;

use App\Entity\PrivateMessage;
use App\Entity\User;
use App\Entity\Vault;
use App\Entity\VaultMessage;
use App\Repository\PrivateMessageRepository;
use App\Repository\UserRepository;
use App\Repository\VaultMemberRepository;
use App\Repository\VaultMessageRepository;
use App\Repository\VaultRepository;
use App\Security\Vault\VaultVoter;
use App\Service\Notification\NotificationMercurePublisher;
use App\Service\VaultSecretCipher;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api', name: 'api_messaging_')]
final class MessagingController extends AbstractController
{
    public function __construct(
        private readonly VaultSecretCipher $messageCipher,
        private readonly NotificationMercurePublisher $notificationPublisher,
    ) {
    }

    #[OA\Get(
        path: '/api/vaults/{vaultId}/messages',
        summary: 'Liste les messages de groupe d un trousseau.',
        security: [['Bearer' => []]],
        tags: ['Messagerie'],
        parameters: [
            new OA\Parameter(name: 'vaultId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'limit', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 200)),
            new OA\Parameter(name: 'since', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date-time')),
            new OA\Parameter(name: 'before', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date-time')),
        ]
    )]
    #[Route('/vaults/{vaultId}/messages', name: 'vault_list', methods: ['GET'], requirements: ['vaultId' => '\\d+'])]
    public function listVaultMessages(
        int $vaultId,
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        VaultRepository $vaultRepository,
        VaultMemberRepository $vaultMemberRepository,
        VaultMessageRepository $vaultMessageRepository,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $vault = $this->resolveVault($vaultId, $authenticatedUser, $vaultRepository);
        if ($vault instanceof JsonResponse) {
            return $vault;
        }

        if (!$this->isGranted(VaultVoter::VIEW, $vault)) {
            return $this->json(['message' => 'Acces interdit.'], Response::HTTP_FORBIDDEN);
        }

        $limit = max(1, min((int) $request->query->get('limit', 80), 200));
        $since = $this->parseSince($request->query->get('since'));
        $before = $this->parseSince($request->query->get('before'));

        $membership = $vaultMemberRepository->findOneByVaultAndUser($vault, $authenticatedUser);
        $previousReadAt = $membership?->getLastChatReadAt();

        if ($membership !== null) {
            $membership->markChatAsRead();
            $entityManager->flush();
        }

        $unreadMarkedCount = 0;
        if ($authenticatedUser instanceof User) {
            $counts = $vaultMessageRepository->findUnreadCountsByVaultForUser($authenticatedUser, [
                $vault->getId() => $previousReadAt,
            ]);
            $unreadMarkedCount = $counts[$vault->getId()] ?? 0;
        }

        $messages = $vaultMessageRepository->findRecentForVault($vault, $limit, $since, $before);

        if ($authenticatedUser instanceof User && $unreadMarkedCount > 0) {
            $this->notificationPublisher->publishForUser($authenticatedUser);
        }

        return $this->json([
            'messages' => array_map(fn (VaultMessage $message) => $this->buildVaultMessagePayload($message, $authenticatedUser), $messages),
            'unreadMarkedCount' => $unreadMarkedCount,
            'hasMoreBefore' => count($messages) >= $limit,
        ]);
    }

    #[OA\Post(
        path: '/api/vaults/{vaultId}/messages',
        summary: 'Envoie un message de groupe dans un trousseau.',
        security: [['Bearer' => []]],
        tags: ['Messagerie'],
        parameters: [
            new OA\Parameter(name: 'vaultId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['content'],
                properties: [
                    new OA\Property(property: 'content', type: 'string', example: 'On valide le partage cet apres-midi ?'),
                ],
                type: 'object'
            )
        )
    )]
    #[Route('/vaults/{vaultId}/messages', name: 'vault_send', methods: ['POST'], requirements: ['vaultId' => '\\d+'])]
    public function sendVaultMessage(
        int $vaultId,
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        VaultRepository $vaultRepository,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $vault = $this->resolveVault($vaultId, $authenticatedUser, $vaultRepository);
        if ($vault instanceof JsonResponse) {
            return $vault;
        }

        if (!$this->isGranted(VaultVoter::VIEW, $vault)) {
            return $this->json(['message' => 'Acces interdit.'], Response::HTTP_FORBIDDEN);
        }

        $requestData = $this->decodeJsonRequest($request);
        if ($requestData instanceof JsonResponse) {
            return $requestData;
        }

        $content = trim((string) ($requestData['content'] ?? ''));
        if ($content === '') {
            return $this->json(['message' => 'Le message ne peut pas etre vide.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        if (mb_strlen($content) > 4000) {
            return $this->json(['message' => 'Le message ne peut pas depasser 4000 caracteres.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $message = (new VaultMessage())
            ->setVault($vault)
            ->setAuthor($authenticatedUser)
            ->setContent((string) $this->messageCipher->encrypt($content));

        $entityManager->persist($message);
        $entityManager->flush();

        foreach ($vault->getMembers() as $member) {
            $memberUser = $member->getUser();
            if (!$memberUser instanceof User || $memberUser->getId() === $authenticatedUser?->getId()) {
                continue;
            }

            $this->notificationPublisher->publishForUser($memberUser);
        }

        return $this->json([
            'message' => $this->buildVaultMessagePayload($message, $authenticatedUser),
        ], Response::HTTP_CREATED);
    }

    #[OA\Get(
        path: '/api/messages/private/contacts',
        summary: 'Liste les contacts disponibles pour la messagerie privee.',
        security: [['Bearer' => []]],
        tags: ['Messagerie']
    )]
    #[Route('/messages/private/contacts', name: 'private_contacts', methods: ['GET'])]
    public function privateContacts(
        #[CurrentUser] ?User $authenticatedUser,
        VaultMemberRepository $vaultMemberRepository,
        PrivateMessageRepository $privateMessageRepository
    ): JsonResponse {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $contacts = [];

        foreach ($vaultMemberRepository->findMessagingPeersForUser($authenticatedUser) as $peerUser) {
            $contacts[$peerUser->getId()] = $peerUser;
        }

        foreach ($privateMessageRepository->findConversationUsers($authenticatedUser) as $peerUser) {
            $contacts[$peerUser->getId()] = $peerUser;
        }

        ksort($contacts);
        $unreadCounts = $privateMessageRepository->findUnreadCountsForRecipient($authenticatedUser);
        $totalUnreadCount = array_sum($unreadCounts);

        return $this->json([
            'contacts' => array_map(
                fn (User $user) => [
                    'id' => $user->getId(),
                    'displayName' => $user->getDisplayName(),
                    'email' => $user->getEmail(),
                    'unreadCount' => $unreadCounts[$user->getId()] ?? 0,
                ],
                array_values($contacts)
            ),
            'totalUnreadCount' => $totalUnreadCount,
        ]);
    }

    #[OA\Get(
        path: '/api/messages/private/{userId}',
        summary: 'Liste une conversation privee entre deux utilisateurs.',
        security: [['Bearer' => []]],
        tags: ['Messagerie'],
        parameters: [
            new OA\Parameter(name: 'userId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'limit', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 200)),
            new OA\Parameter(name: 'since', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date-time')),
            new OA\Parameter(name: 'before', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date-time')),
        ]
    )]
    #[Route('/messages/private/{userId}', name: 'private_list', methods: ['GET'], requirements: ['userId' => '\\d+'])]
    public function listPrivateMessages(
        int $userId,
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        UserRepository $userRepository,
        PrivateMessageRepository $privateMessageRepository
    ): JsonResponse {
        $recipient = $this->resolveRecipient($userId, $authenticatedUser, $userRepository);
        if ($recipient instanceof JsonResponse) {
            return $recipient;
        }

        $limit = max(1, min((int) $request->query->get('limit', 80), 200));
        $since = $this->parseSince($request->query->get('since'));
        $before = $this->parseSince($request->query->get('before'));
        $unreadMarkedCount = $privateMessageRepository->markConversationAsRead($authenticatedUser, $recipient);

        $messages = $privateMessageRepository->findConversation($authenticatedUser, $recipient, $limit, $since, $before);

        if ($authenticatedUser instanceof User && $unreadMarkedCount > 0) {
            $this->notificationPublisher->publishForUser($authenticatedUser);
        }

        return $this->json([
            'messages' => array_map(fn (PrivateMessage $message) => $this->buildPrivateMessagePayload($message, $authenticatedUser), $messages),
            'unreadMarkedCount' => $unreadMarkedCount,
            'hasMoreBefore' => count($messages) >= $limit,
        ]);
    }

    #[OA\Post(
        path: '/api/messages/private/{userId}',
        summary: 'Envoie un message prive a un utilisateur.',
        security: [['Bearer' => []]],
        tags: ['Messagerie'],
        parameters: [
            new OA\Parameter(name: 'userId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['content'],
                properties: [
                    new OA\Property(property: 'content', type: 'string', example: 'Tu peux verifier le trousseau Projet ?'),
                ],
                type: 'object'
            )
        )
    )]
    #[Route('/messages/private/{userId}', name: 'private_send', methods: ['POST'], requirements: ['userId' => '\\d+'])]
    public function sendPrivateMessage(
        int $userId,
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $recipient = $this->resolveRecipient($userId, $authenticatedUser, $userRepository);
        if ($recipient instanceof JsonResponse) {
            return $recipient;
        }

        $requestData = $this->decodeJsonRequest($request);
        if ($requestData instanceof JsonResponse) {
            return $requestData;
        }

        $content = trim((string) ($requestData['content'] ?? ''));
        if ($content === '') {
            return $this->json(['message' => 'Le message ne peut pas etre vide.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        if (mb_strlen($content) > 4000) {
            return $this->json(['message' => 'Le message ne peut pas depasser 4000 caracteres.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $message = (new PrivateMessage())
            ->setSender($authenticatedUser)
            ->setRecipient($recipient)
            ->setContent((string) $this->messageCipher->encrypt($content));

        $entityManager->persist($message);
        $entityManager->flush();

        $this->notificationPublisher->publishForUser($recipient);

        return $this->json([
            'message' => $this->buildPrivateMessagePayload($message, $authenticatedUser),
        ], Response::HTTP_CREATED);
    }

    private function resolveVault(int $vaultId, ?User $authenticatedUser, VaultRepository $vaultRepository): Vault|JsonResponse
    {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $vault = $vaultRepository->find($vaultId);
        if (!$vault instanceof Vault) {
            return $this->json(['message' => 'Trousseau introuvable.'], Response::HTTP_NOT_FOUND);
        }

        return $vault;
    }

    private function resolveRecipient(int $userId, ?User $authenticatedUser, UserRepository $userRepository): User|JsonResponse
    {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $recipient = $userRepository->findActiveById($userId);
        if (!$recipient instanceof User) {
            return $this->json(['message' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if ($recipient->getId() === $authenticatedUser->getId()) {
            return $this->json(['message' => 'Vous ne pouvez pas vous envoyer un message prive a vous-meme.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return $recipient;
    }

    private function decodeJsonRequest(Request $request): array|JsonResponse
    {
        $rawContent = trim($request->getContent());

        if ($rawContent === '') {
            return [];
        }

        try {
            $decodedPayload = json_decode($rawContent, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['message' => 'Le corps de la requete doit etre un JSON valide.'], Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($decodedPayload)) {
            return $this->json(['message' => 'Le corps de la requete doit etre un objet JSON.'], Response::HTTP_BAD_REQUEST);
        }

        return $decodedPayload;
    }

    private function parseSince(mixed $value): ?\DateTimeImmutable
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return new \DateTimeImmutable(trim($value));
        } catch (\Exception) {
            return null;
        }
    }

    private function buildVaultMessagePayload(VaultMessage $message, ?User $authenticatedUser): array
    {
        $author = $message->getAuthor();

        return [
            'id' => $message->getId(),
            'vaultId' => $message->getVault()?->getId(),
            'content' => $this->messageCipher->decrypt($message->getContent()) ?? '',
            'createdAt' => $message->getCreatedAt()->format(DATE_ATOM),
            'author' => [
                'id' => $author?->getId(),
                'displayName' => $author?->getDisplayName(),
                'email' => $author?->getEmail(),
                'isCurrentUser' => $authenticatedUser instanceof User && $author?->getId() === $authenticatedUser->getId(),
            ],
        ];
    }

    private function buildPrivateMessagePayload(PrivateMessage $message, ?User $authenticatedUser): array
    {
        $sender = $message->getSender();
        $recipient = $message->getRecipient();

        return [
            'id' => $message->getId(),
            'content' => $this->messageCipher->decrypt($message->getContent()) ?? '',
            'createdAt' => $message->getCreatedAt()->format(DATE_ATOM),
            'readAt' => $message->getReadAt()?->format(DATE_ATOM),
            'isRead' => $message->isRead(),
            'sender' => [
                'id' => $sender?->getId(),
                'displayName' => $sender?->getDisplayName(),
                'email' => $sender?->getEmail(),
                'isCurrentUser' => $authenticatedUser instanceof User && $sender?->getId() === $authenticatedUser->getId(),
            ],
            'recipient' => [
                'id' => $recipient?->getId(),
                'displayName' => $recipient?->getDisplayName(),
                'email' => $recipient?->getEmail(),
            ],
        ];
    }
}
