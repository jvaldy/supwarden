<?php

declare(strict_types=1);

namespace App\Controller\Vault;

use App\Dto\Vault\CreateVaultInput;
use App\Dto\Vault\UpdateVaultInput;
use App\Entity\User;
use App\Entity\Vault;
use App\Entity\VaultMember;
use App\Enum\VaultMemberRole;
use App\Enum\VaultType;
use App\Repository\VaultMemberRepository;
use App\Repository\VaultMessageRepository;
use App\Repository\VaultRepository;
use App\Security\Vault\VaultVoter;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Validator\ConstraintViolationInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/vaults', name: 'api_vaults_')]
final class VaultController extends AbstractController
{
    #[OA\Post(
        path: '/api/vaults',
        summary: 'Cree un trousseau personnel.',
        security: [['Bearer' => []]],
        tags: ['Trousseaux'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Streaming'),
                    new OA\Property(property: 'description', type: 'string', nullable: true, example: 'Acces partages de l equipe'),
                ],
                type: 'object'
            )
        )
    )]
    #[Route('', name: 'create', methods: ['POST'])]
    public function create(
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $requestData = $this->decodeJsonRequest($request);
        if ($requestData instanceof JsonResponse) {
            return $requestData;
        }

        $input = new CreateVaultInput();
        $input->name = (string) ($requestData['name'] ?? '');
        $input->description = isset($requestData['description']) ? (string) $requestData['description'] : null;

        $validationErrors = $this->formatViolations($validator->validate($input));
        if ($validationErrors !== []) {
            return $this->json([
                'message' => 'Les donnees fournies sont invalides.',
                'errors' => $validationErrors,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $vault = (new Vault())
            ->setName($input->name)
            ->setDescription($input->description)
            ->setOwner($authenticatedUser);

        $ownerMembership = (new VaultMember())
            ->setUser($authenticatedUser)
            ->setRole(VaultMemberRole::OWNER);

        $vault->addMember($ownerMembership);

        $entityManager->persist($vault);
        $entityManager->flush();

        return $this->json([
            'vault' => $this->buildVaultPayload($vault, true, $authenticatedUser, 0),
        ], Response::HTTP_CREATED);
    }

    #[OA\Get(
        path: '/api/vaults',
        summary: 'Liste les trousseaux accessibles.',
        security: [['Bearer' => []]],
        tags: ['Trousseaux'],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
        ]
    )]
    #[OA\Get(
        path: '/api/vaults/search',
        summary: 'Recherche parmi les trousseaux accessibles.',
        security: [['Bearer' => []]],
        tags: ['Trousseaux'],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
        ]
    )]
    #[Route('', name: 'list', methods: ['GET'])]
    #[Route('/search', name: 'search', methods: ['GET'])]
    public function list(
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        VaultRepository $vaultRepository,
        VaultMemberRepository $vaultMemberRepository,
        VaultMessageRepository $vaultMessageRepository
    ): JsonResponse {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $searchQuery = $request->query->get('search');
        $vaults = $vaultRepository->findAccessibleVaultsForUser(
            $authenticatedUser,
            is_string($searchQuery) ? $searchQuery : null
        );

        usort(
            $vaults,
            function (Vault $leftVault, Vault $rightVault) use ($authenticatedUser): int {
                $leftPinned = $this->isSystemPersonalVault($leftVault, $authenticatedUser);
                $rightPinned = $this->isSystemPersonalVault($rightVault, $authenticatedUser);

                if ($leftPinned !== $rightPinned) {
                    return $leftPinned ? -1 : 1;
                }

                return $rightVault->getCreatedAt() <=> $leftVault->getCreatedAt();
            }
        );

        $unreadCounts = $this->buildUnreadCountsByVaultId($authenticatedUser, $vaultMemberRepository, $vaultMessageRepository);

        return $this->json([
            'vaults' => array_map(
                fn (Vault $vault) => $this->buildVaultPayload($vault, false, $authenticatedUser, $unreadCounts[$vault->getId()] ?? 0),
                $vaults
            ),
            'totalUnreadMessageCount' => array_sum($unreadCounts),
        ]);
    }

    #[OA\Get(
        path: '/api/vaults/{id}',
        summary: 'Affiche le detail d un trousseau.',
        security: [['Bearer' => []]],
        tags: ['Trousseaux'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ]
    )]
    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => '\\d+'])]
    public function show(
        int $id,
        #[CurrentUser] ?User $authenticatedUser,
        VaultRepository $vaultRepository,
        VaultMemberRepository $vaultMemberRepository,
        VaultMessageRepository $vaultMessageRepository
    ): JsonResponse {
        $vault = $this->resolveVault($id, $authenticatedUser, $vaultRepository);
        if ($vault instanceof JsonResponse) {
            return $vault;
        }

        if (!$this->isGranted(VaultVoter::VIEW, $vault)) {
            return $this->json(['message' => 'Acces interdit.'], Response::HTTP_FORBIDDEN);
        }

        $membership = $authenticatedUser instanceof User ? $vaultMemberRepository->findOneByVaultAndUser($vault, $authenticatedUser) : null;
        $unreadCounts = $this->buildUnreadCountsByVaultId($authenticatedUser, $vaultMemberRepository, $vaultMessageRepository, $vault->getId());

        return $this->json([
            'vault' => $this->buildVaultPayload($vault, true, $authenticatedUser, $unreadCounts[$vault->getId()] ?? 0, $membership),
        ]);
    }

    #[OA\Patch(
        path: '/api/vaults/{id}',
        summary: 'Met a jour les metadonnees d un trousseau.',
        security: [['Bearer' => []]],
        tags: ['Trousseaux'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ]
    )]
    #[Route('/{id}', name: 'update', methods: ['PATCH'], requirements: ['id' => '\\d+'])]
    public function update(
        int $id,
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        VaultRepository $vaultRepository,
        VaultMemberRepository $vaultMemberRepository,
        VaultMessageRepository $vaultMessageRepository,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $vault = $this->resolveVault($id, $authenticatedUser, $vaultRepository);
        if ($vault instanceof JsonResponse) {
            return $vault;
        }

        if (!$this->isGranted(VaultVoter::EDIT, $vault)) {
            return $this->json(['message' => 'Acces interdit.'], Response::HTTP_FORBIDDEN);
        }

        if ($this->isSystemPersonalVault($vault, $authenticatedUser)) {
            return $this->json(['message' => 'Impossible de modifier le trousseau personnel.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $requestData = $this->decodeJsonRequest($request);
        if ($requestData instanceof JsonResponse) {
            return $requestData;
        }

        $input = new UpdateVaultInput();
        $input->name = isset($requestData['name']) ? (string) $requestData['name'] : null;
        $input->description = isset($requestData['description']) ? (string) $requestData['description'] : null;

        $validationErrors = $this->formatViolations($validator->validate($input));
        if ($validationErrors !== []) {
            return $this->json([
                'message' => 'Les donnees fournies sont invalides.',
                'errors' => $validationErrors,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $vault->setName((string) $input->name);
        $vault->setDescription($input->description);
        $entityManager->flush();

        $membership = $authenticatedUser instanceof User ? $vaultMemberRepository->findOneByVaultAndUser($vault, $authenticatedUser) : null;
        $unreadCounts = $this->buildUnreadCountsByVaultId($authenticatedUser, $vaultMemberRepository, $vaultMessageRepository, $vault->getId());

        return $this->json([
            'vault' => $this->buildVaultPayload($vault, true, $authenticatedUser, $unreadCounts[$vault->getId()] ?? 0, $membership),
        ]);
    }

    #[OA\Delete(
        path: '/api/vaults/{id}',
        summary: 'Supprime un trousseau.',
        security: [['Bearer' => []]],
        tags: ['Trousseaux'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ]
    )]
    #[Route('/{id}', name: 'delete', methods: ['DELETE'], requirements: ['id' => '\\d+'])]
    public function delete(
        int $id,
        #[CurrentUser] ?User $authenticatedUser,
        VaultRepository $vaultRepository,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $vault = $this->resolveVault($id, $authenticatedUser, $vaultRepository);
        if ($vault instanceof JsonResponse) {
            return $vault;
        }

        if ($this->isSystemPersonalVault($vault, $authenticatedUser)) {
            return $this->json(['message' => 'Impossible de supprimer le trousseau personnel.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (!$this->isGranted(VaultVoter::DELETE, $vault)) {
            return $this->json(['message' => 'Acces interdit.'], Response::HTTP_FORBIDDEN);
        }

        $entityManager->remove($vault);
        $entityManager->flush();

        return $this->json(['message' => 'Le trousseau a bien ete supprime.']);
    }

    private function decodeJsonRequest(Request $request): array|JsonResponse
    {
        $requestContent = $request->getContent();

        if ($requestContent === '') {
            return new JsonResponse(['message' => 'Le corps de la requete JSON est requis.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $decodedRequestData = json_decode($requestContent, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return new JsonResponse(['message' => 'Le JSON fourni est invalide.'], Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($decodedRequestData)) {
            return new JsonResponse(['message' => 'Le corps de la requete doit etre un objet JSON.'], Response::HTTP_BAD_REQUEST);
        }

        return $decodedRequestData;
    }

    /**
     * @param iterable<ConstraintViolationInterface> $constraintViolations
     * @return array<string, list<string>>
     */
    private function formatViolations(iterable $constraintViolations): array
    {
        $validationErrors = [];

        foreach ($constraintViolations as $constraintViolation) {
            $fieldName = $constraintViolation->getPropertyPath() ?: 'global';
            $validationErrors[$fieldName][] = $constraintViolation->getMessage();
        }

        return $validationErrors;
    }

    private function resolveVault(int $id, ?User $authenticatedUser, VaultRepository $vaultRepository): Vault|JsonResponse
    {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $vault = $vaultRepository->find($id);
        if (!$vault instanceof Vault) {
            return $this->json(['message' => 'Trousseau introuvable.'], Response::HTTP_NOT_FOUND);
        }

        return $vault;
    }

    /**
     * @return array<int, int>
     */
    private function buildUnreadCountsByVaultId(
        ?User $authenticatedUser,
        VaultMemberRepository $vaultMemberRepository,
        VaultMessageRepository $vaultMessageRepository,
        ?int $onlyVaultId = null
    ): array {
        if (!$authenticatedUser instanceof User) {
            return [];
        }

        $memberships = $vaultMemberRepository->findByUserIndexedByVaultId($authenticatedUser);
        if ($memberships === []) {
            return [];
        }

        if ($onlyVaultId !== null) {
            $memberships = isset($memberships[$onlyVaultId]) ? [$onlyVaultId => $memberships[$onlyVaultId]] : [];
        }

        $lastReadByVaultId = [];
        foreach ($memberships as $vaultId => $membership) {
            $lastReadByVaultId[$vaultId] = $membership->getLastChatReadAt();
        }

        return $vaultMessageRepository->findUnreadCountsByVaultForUser($authenticatedUser, $lastReadByVaultId);
    }

    private function buildVaultPayload(
        Vault $vault,
        bool $includeMembers,
        ?User $authenticatedUser = null,
        int $unreadMessageCount = 0,
        ?VaultMember $currentMember = null
    ): array {
        if ($currentMember === null && $authenticatedUser instanceof User) {
            foreach ($vault->getMembers() as $member) {
                if ($member->getUser()?->getId() === $authenticatedUser->getId()) {
                    $currentMember = $member;
                    break;
                }
            }
        }

        $isOwner = $authenticatedUser instanceof User && $vault->getOwner()?->getId() === $authenticatedUser->getId();
        $currentRole = $isOwner ? VaultMemberRole::OWNER->value : $currentMember?->getRole()->value;
        $isPinnedPersonalVault = $this->isSystemPersonalVault($vault, $authenticatedUser);

        $payload = [
            'id' => $vault->getId(),
            'name' => $vault->getName(),
            'description' => $vault->getDescription(),
            'type' => $vault->getType()->value,
            'isPersonalDefault' => $isPinnedPersonalVault,
            'memberCount' => $vault->getMembers()->count(),
            'unreadMessageCount' => $unreadMessageCount,
            'createdAt' => $vault->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $vault->getUpdatedAt()->format(\DateTimeInterface::ATOM),
            'access' => [
                'role' => $currentRole,
                'canEdit' => $authenticatedUser instanceof User ? $this->isGranted(VaultVoter::EDIT, $vault) : false,
                'canDelete' => $authenticatedUser instanceof User ? (!$isPinnedPersonalVault && $this->isGranted(VaultVoter::DELETE, $vault)) : false,
                'canManageMembers' => $authenticatedUser instanceof User ? $this->isGranted(VaultVoter::MANAGE_MEMBERS, $vault) : false,
                'canInviteMembers' => $authenticatedUser instanceof User ? (!$isPinnedPersonalVault && $this->isGranted(VaultVoter::MANAGE_MEMBERS, $vault)) : false,
            ],
            'owner' => [
                'id' => $vault->getOwner()?->getId(),
                'email' => $vault->getOwner()?->getEmail(),
                'displayName' => $vault->getOwner()?->getDisplayName(),
            ],
        ];

        if ($includeMembers) {
            $payload['members'] = array_map(
                fn (VaultMember $member) => [
                    'id' => $member->getId(),
                    'role' => $member->getRole()->value,
                    'createdAt' => $member->getCreatedAt()->format(\DateTimeInterface::ATOM),
                    'user' => [
                        'id' => $member->getUser()?->getId(),
                        'email' => $member->getUser()?->getEmail(),
                        'displayName' => $member->getUser()?->getDisplayName(),
                    ],
                ],
                $vault->getMembers()->toArray()
            );
        }

        return $payload;
    }

    private function isSystemPersonalVault(Vault $vault, ?User $authenticatedUser): bool
    {
        if (!$authenticatedUser instanceof User) {
            return false;
        }

        if ($vault->getOwner()?->getId() !== $authenticatedUser->getId()) {
            return false;
        }

        return $vault->getType() === VaultType::PERSONAL
            && mb_strtolower(trim($vault->getName())) === 'trousseau personnel';
    }
}


