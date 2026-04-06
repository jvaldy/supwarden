<?php

declare(strict_types=1);

namespace App\Controller\Vault;

use App\Dto\Vault\CreateVaultInput;
use App\Dto\Vault\UpdateVaultInput;
use App\Entity\User;
use App\Entity\Vault;
use App\Entity\VaultMember;
use App\Enum\VaultMemberRole;
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
        summary: 'CrÃ©e un trousseau personnel.',
        security: [['Bearer' => []]],
        tags: ['Trousseaux'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Streaming'),
                    new OA\Property(property: 'description', type: 'string', nullable: true, example: 'AccÃ¨s partagÃ©s de lâ€™Ã©quipe'),
                ],
                type: 'object'
            )
        )
    )]
    #[OA\Response(response: 201, description: 'Trousseau crÃ©Ã©.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 422, description: 'DonnÃ©es invalides.')]
    #[Route('', name: 'create', methods: ['POST'])]
    // CrÃ©e un trousseau personnel puis y rattache immÃ©diatement son propriÃ©taire comme OWNER.
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

        $createVaultInput = new CreateVaultInput();
        $createVaultInput->name = (string) ($requestData['name'] ?? '');
        $createVaultInput->description = isset($requestData['description']) ? (string) $requestData['description'] : null;

        $validationErrors = $this->formatViolations($validator->validate($createVaultInput));

        if ($validationErrors !== []) {
            return $this->json([
                'message' => 'Les donnÃ¯Â¿Â½es fournies sont invalides.',
                'errors' => $validationErrors,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $vault = (new Vault())
            ->setName($createVaultInput->name)
            ->setDescription($createVaultInput->description)
            ->setOwner($authenticatedUser);

        $ownerMembership = (new VaultMember())
            ->setUser($authenticatedUser)
            ->setRole(VaultMemberRole::OWNER);

        $vault->addMember($ownerMembership);

        $entityManager->persist($vault);
        $entityManager->flush();

        return $this->json([
            'vault' => $this->buildVaultPayload($vault, true, $authenticatedUser),
        ], Response::HTTP_CREATED);
    }

    #[OA\Get(
        path: '/api/vaults',
        summary: 'Liste les trousseaux accessibles.',
        security: [['Bearer' => []]],
        tags: ['Trousseaux'],
        parameters: [
            new OA\Parameter(name: 'q', in: 'query', required: false, schema: new OA\Schema(type: 'string'), description: 'Recherche par nom ou description.'),
        ]
    )]
    #[OA\Get(
        path: '/api/vaults/search',
        summary: 'Recherche parmi les trousseaux accessibles.',
        security: [['Bearer' => []]],
        tags: ['Trousseaux'],
        parameters: [
            new OA\Parameter(name: 'q', in: 'query', required: false, schema: new OA\Schema(type: 'string'), description: 'Recherche par nom ou description.'),
        ]
    )]
    #[OA\Response(response: 200, description: 'Liste des trousseaux.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[Route('', name: 'list', methods: ['GET'])]
    #[Route('/search', name: 'search', methods: ['GET'])]
    // Retourne uniquement les trousseaux que lâ€™utilisateur possÃ¨de ou auxquels il appartient.
    public function list(
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        VaultRepository $vaultRepository
    ): JsonResponse {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $searchQuery = $request->query->get('q');
        $vaults = $vaultRepository->findAccessibleVaultsForUser(
            $authenticatedUser,
            is_string($searchQuery) ? $searchQuery : null
        );

        return $this->json([
            'vaults' => array_map(
                fn (Vault $vault) => $this->buildVaultPayload($vault, false, $authenticatedUser),
                $vaults
            ),
        ]);
    }

    #[OA\Get(
        path: '/api/vaults/{id}',
        summary: 'Affiche le dÃ©tail dâ€™un trousseau.',
        security: [['Bearer' => []]],
        tags: ['Trousseaux'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ]
    )]
    #[OA\Response(response: 200, description: 'DÃ©tail du trousseau.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'AccÃ¨s interdit.')]
    #[OA\Response(response: 404, description: 'Trousseau introuvable.')]
    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => '\\d+'])]
    // Expose le dÃ©tail complet dâ€™un trousseau seulement Ã  ses membres.
    public function show(
        int $id,
        #[CurrentUser] ?User $authenticatedUser,
        VaultRepository $vaultRepository
    ): JsonResponse {
        $vault = $this->resolveVault($id, $authenticatedUser, $vaultRepository);

        if ($vault instanceof JsonResponse) {
            return $vault;
        }

        if (!$this->isGranted(VaultVoter::VIEW, $vault)) {
            return $this->json(['message' => 'AccÃ¯Â¿Â½s interdit.'], Response::HTTP_FORBIDDEN);
        }

        return $this->json([
            'vault' => $this->buildVaultPayload($vault, true, $authenticatedUser),
        ]);
    }

    #[OA\Patch(
        path: '/api/vaults/{id}',
        summary: 'Met Ã  jour les mÃ©tadonnÃ©es dâ€™un trousseau.',
        security: [['Bearer' => []]],
        tags: ['Trousseaux'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Streaming 2026'),
                    new OA\Property(property: 'description', type: 'string', nullable: true, example: 'AccÃ¨s mis Ã  jour'),
                ],
                type: 'object'
            )
        )
    )]
    #[OA\Response(response: 200, description: 'Trousseau mis Ã  jour.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'AccÃ¨s interdit.')]
    #[OA\Response(response: 404, description: 'Trousseau introuvable.')]
    #[OA\Response(response: 422, description: 'DonnÃ©es invalides.')]
    #[Route('/{id}', name: 'update', methods: ['PATCH'], requirements: ['id' => '\\d+'])]
    // Met Ã  jour les mÃ©tadonnÃ©es du trousseau si le rÃ´le le permet.
    public function update(
        int $id,
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        VaultRepository $vaultRepository,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $vault = $this->resolveVault($id, $authenticatedUser, $vaultRepository);

        if ($vault instanceof JsonResponse) {
            return $vault;
        }

        if (!$this->isGranted(VaultVoter::EDIT, $vault)) {
            return $this->json(['message' => 'AccÃ¯Â¿Â½s interdit.'], Response::HTTP_FORBIDDEN);
        }

        $requestData = $this->decodeJsonRequest($request);

        if ($requestData instanceof JsonResponse) {
            return $requestData;
        }

        $updateVaultInput = new UpdateVaultInput();
        $updateVaultInput->name = isset($requestData['name']) ? (string) $requestData['name'] : null;
        $updateVaultInput->description = isset($requestData['description']) ? (string) $requestData['description'] : null;

        $validationErrors = $this->formatViolations($validator->validate($updateVaultInput));

        if ($validationErrors !== []) {
            return $this->json([
                'message' => 'Les donnÃ¯Â¿Â½es fournies sont invalides.',
                'errors' => $validationErrors,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $vault->setName((string) $updateVaultInput->name);
        $vault->setDescription($updateVaultInput->description);
        $entityManager->flush();

        return $this->json([
            'vault' => $this->buildVaultPayload($vault, true, $authenticatedUser),
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
    #[OA\Response(response: 200, description: 'Trousseau supprimÃ©.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'AccÃ¨s interdit.')]
    #[OA\Response(response: 404, description: 'Trousseau introuvable.')]
    #[Route('/{id}', name: 'delete', methods: ['DELETE'], requirements: ['id' => '\\d+'])]
    // Supprime dÃ©finitivement un trousseau uniquement pour son propriÃ©taire.
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

        if (!$this->isGranted(VaultVoter::DELETE, $vault)) {
            return $this->json(['message' => 'AccÃ¯Â¿Â½s interdit.'], Response::HTTP_FORBIDDEN);
        }

        $entityManager->remove($vault);
        $entityManager->flush();

        return $this->json([
            'message' => 'Le trousseau a bien Ã¯Â¿Â½tÃ¯Â¿Â½ supprimÃ¯Â¿Â½.',
        ]);
    }

    /**
     * @return array<string, mixed>|JsonResponse
     */
    private function decodeJsonRequest(Request $request): array|JsonResponse
    {
        $requestContent = $request->getContent();

        if ($requestContent === '') {
            return new JsonResponse(['message' => 'Le corps de la requÃ¯Â¿Â½te JSON est requis.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $decodedRequestData = json_decode($requestContent, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return new JsonResponse(['message' => 'Le JSON fourni est invalide.'], Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($decodedRequestData)) {
            return new JsonResponse(['message' => 'Le corps de la requÃ¯Â¿Â½te doit Ã¯Â¿Â½tre un objet JSON.'], Response::HTTP_BAD_REQUEST);
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

    /**
     * @return Vault|JsonResponse
     */
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
     * @return array<string, mixed>
     */
    private function buildVaultPayload(Vault $vault, bool $includeMembers, ?User $authenticatedUser = null): array
    {
        $currentMember = null;

        if ($authenticatedUser instanceof User) {
            foreach ($vault->getMembers() as $member) {
                if ($member->getUser()?->getId() === $authenticatedUser->getId()) {
                    $currentMember = $member;
                    break;
                }
            }
        }

        $isOwner = $authenticatedUser instanceof User && $vault->getOwner()?->getId() === $authenticatedUser->getId();
        $currentRole = $isOwner
            ? VaultMemberRole::OWNER->value
            : $currentMember?->getRole()->value;

        $payload = [
            'id' => $vault->getId(),
            'name' => $vault->getName(),
            'description' => $vault->getDescription(),
            'type' => $vault->getType()->value,
            'memberCount' => $vault->getMembers()->count(),
            'createdAt' => $vault->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $vault->getUpdatedAt()->format(\DateTimeInterface::ATOM),
            'access' => [
                'role' => $currentRole,
                'canEdit' => $authenticatedUser instanceof User ? $this->isGranted(VaultVoter::EDIT, $vault) : false,
                'canDelete' => $authenticatedUser instanceof User ? $this->isGranted(VaultVoter::DELETE, $vault) : false,
                'canManageMembers' => $authenticatedUser instanceof User ? $this->isGranted(VaultVoter::MANAGE_MEMBERS, $vault) : false,
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
}
