<?php

declare(strict_types=1);

namespace App\Controller\Item;

use App\Dto\Item\CreateVaultItemInput;
use App\Dto\Item\UpdateVaultItemInput;
use App\Entity\Attachment;
use App\Entity\CustomField;
use App\Entity\ItemPermission;
use App\Entity\ItemUri;
use App\Entity\User;
use App\Entity\Vault;
use App\Entity\VaultItem;
use App\Enum\ItemType;
use App\Repository\VaultItemRepository;
use App\Repository\VaultRepository;
use App\Service\VaultSecretCipher;
use App\Security\Vault\ItemVoter;
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

#[Route('/api', name: 'api_items_')]
final class ItemController extends AbstractController
{
    public function __construct(private readonly VaultSecretCipher $secretCipher)
    {
    }

    #[OA\Get(
        path: '/api/vaults/{vaultId}/items',
        summary: 'Liste les ?l?ments d?un trousseau.',
        security: [['Bearer' => []]],
        tags: ['Ã‰l?ments'],
        parameters: [
            new OA\Parameter(name: 'vaultId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ]
    )]
    #[OA\Response(response: 200, description: 'Liste des ?l?ments.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'Acc?s interdit.')]
    #[OA\Response(response: 404, description: 'Trousseau introuvable.')]
    #[Route('/vaults/{vaultId}/items', name: 'list', methods: ['GET'], requirements: ['vaultId' => '\\d+'])]
    public function list(int $vaultId, #[CurrentUser] ?User $authenticatedUser, VaultRepository $vaultRepository, VaultItemRepository $vaultItemRepository): JsonResponse
    {
        $vault = $this->resolveVault($vaultId, $authenticatedUser, $vaultRepository);

        if ($vault instanceof JsonResponse) {
            return $vault;
        }

        if (!$this->isGranted(VaultVoter::VIEW, $vault)) {
            return $this->json(['message' => 'Acc?s interdit.'], Response::HTTP_FORBIDDEN);
        }

        return $this->json([
            'items' => array_map(fn (VaultItem $item) => $this->buildItemPayload($item, false), $vaultItemRepository->findByVault($vault)),
        ]);
    }

    #[OA\Post(
        path: '/api/vaults/{vaultId}/items',
        summary: 'Cr?e un ?l?ment dans un trousseau.',
        security: [['Bearer' => []]],
        tags: ['Ã‰l?ments'],
        parameters: [
            new OA\Parameter(name: 'vaultId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Facebook'),
                    new OA\Property(property: 'username', type: 'string', nullable: true, example: 'john'),
                    new OA\Property(property: 'secret', type: 'string', nullable: true, example: 'motdepassefort'),
                    new OA\Property(property: 'notes', type: 'string', nullable: true, example: 'Compte partag?'),
                    new OA\Property(property: 'isSensitive', type: 'boolean', example: true),
                    new OA\Property(property: 'uris', type: 'array', items: new OA\Items(type: 'object')),
                    new OA\Property(property: 'customFields', type: 'array', items: new OA\Items(type: 'object')),
                ],
                type: 'object'
            )
        )
    )]
    #[OA\Response(response: 201, description: 'Ã‰l?ment cr??.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'Acc?s interdit.')]
    #[OA\Response(response: 404, description: 'Trousseau introuvable.')]
    #[OA\Response(response: 422, description: 'Donn?es invalides.')]
    #[Route('/vaults/{vaultId}/items', name: 'create', methods: ['POST'], requirements: ['vaultId' => '\\d+'])]
    public function create(
        int $vaultId,
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        VaultRepository $vaultRepository,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $vault = $this->resolveVault($vaultId, $authenticatedUser, $vaultRepository);

        if ($vault instanceof JsonResponse) {
            return $vault;
        }

        if (!$this->isGranted(VaultVoter::EDIT, $vault)) {
            return $this->json(['message' => 'Acc?s interdit.'], Response::HTTP_FORBIDDEN);
        }

        $requestData = $this->decodeJsonRequest($request);

        if ($requestData instanceof JsonResponse) {
            return $requestData;
        }

        $input = new CreateVaultItemInput();
        $input->name = isset($requestData['name']) ? (string) $requestData['name'] : null;
        $input->username = isset($requestData['username']) ? (string) $requestData['username'] : null;
        $input->secret = isset($requestData['secret']) ? (string) $requestData['secret'] : null;
        $input->notes = isset($requestData['notes']) ? (string) $requestData['notes'] : null;
        $input->isSensitive = (bool) ($requestData['isSensitive'] ?? false);
        $input->uris = is_array($requestData['uris'] ?? null) ? $requestData['uris'] : [];
        $input->customFields = is_array($requestData['customFields'] ?? null) ? $requestData['customFields'] : [];
        $itemPermissions = is_array($requestData['itemPermissions'] ?? null) ? $requestData['itemPermissions'] : [];

        $errors = $this->formatViolations($validator->validate($input));
        $this->validateUris($input->uris, $errors);
        $this->validateCustomFields($input->customFields, $errors);
        $this->validateItemPermissions($vault, $itemPermissions, $errors);

        if ($errors !== []) {
            return $this->json(['message' => 'Les donn?es fournies sont invalides.', 'errors' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $item = (new VaultItem())
            ->setVault($vault)
            ->setType(ItemType::LOGIN)
            ->setName((string) $input->name)
            ->setUsername($input->username)
            ->setSecret($this->secretCipher->encrypt($input->secret))
            ->setIsSensitive($input->isSensitive)
            ->setNotes($input->notes);

        $this->syncUris($item, $input->uris);
        $this->syncCustomFields($item, $input->customFields);
        $this->syncItemPermissions($item, $vault, $itemPermissions);

        $entityManager->persist($item);
        $entityManager->flush();

        return $this->json(['item' => $this->buildItemPayload($item, true)], Response::HTTP_CREATED);
    }

    #[OA\Get(
        path: '/api/items/{itemId}',
        summary: 'Affiche le d?tail d?un ?l?ment.',
        security: [['Bearer' => []]],
        tags: ['Ã‰l?ments'],
        parameters: [
            new OA\Parameter(name: 'itemId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ]
    )]
    #[OA\Response(response: 200, description: 'D?tail de l??l?ment.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'Acc?s interdit.')]
    #[OA\Response(response: 404, description: 'Ã‰l?ment introuvable.')]
    #[Route('/items/{itemId}', name: 'show', methods: ['GET'], requirements: ['itemId' => '\\d+'])]
    public function show(int $itemId, #[CurrentUser] ?User $authenticatedUser, VaultItemRepository $vaultItemRepository): JsonResponse
    {
        $item = $this->resolveItem($itemId, $vaultItemRepository, $authenticatedUser);

        if ($item instanceof JsonResponse) {
            return $item;
        }

        if (!$this->isGranted(ItemVoter::VIEW, $item)) {
            return $this->json(['message' => 'Acc?s interdit.'], Response::HTTP_FORBIDDEN);
        }

        return $this->json(['item' => $this->buildItemPayload($item, true)]);
    }

    #[OA\Post(
        path: '/api/items/{itemId}/unlock-secret',
        summary: 'D?verrouille le secret d?un ?l?ment sensible.',
        security: [['Bearer' => []]],
        tags: ['Ã‰l?ments'],
        parameters: [
            new OA\Parameter(name: 'itemId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'pin', type: 'string', example: '1234'),
                ],
                type: 'object'
            )
        )
    )]
    #[OA\Response(response: 200, description: 'Secret d?verrouill?.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'PIN invalide ou acc?s interdit.')]
    #[OA\Response(response: 404, description: 'Ã‰l?ment ou secret introuvable.')]
    #[OA\Response(response: 422, description: 'PIN manquant.')]
    #[Route('/items/{itemId}/unlock-secret', name: 'unlock_secret', methods: ['POST'], requirements: ['itemId' => '\\d+'])]
    public function unlockSecret(int $itemId, Request $request, #[CurrentUser] ?User $authenticatedUser, VaultItemRepository $vaultItemRepository): JsonResponse
    {
        $item = $this->resolveItem($itemId, $vaultItemRepository, $authenticatedUser);

        if ($item instanceof JsonResponse) {
            return $item;
        }

        if (!$this->isGranted(ItemVoter::REVEAL_SECRET, $item)) {
            return $this->json(['message' => 'Acc?s interdit.'], Response::HTTP_FORBIDDEN);
        }

        $decryptedSecret = $this->secretCipher->decrypt($item->getSecret());

        if ($decryptedSecret === null) {
            return $this->json(['message' => 'Aucun secret enregistr? pour cet ?l?ment.'], Response::HTTP_NOT_FOUND);
        }

        if (!$item->isSensitive()) {
            return $this->json(['secret' => $decryptedSecret]);
        }

        $requestData = $this->decodeJsonRequest($request);

        if ($requestData instanceof JsonResponse) {
            return $requestData;
        }

        $pin = isset($requestData['pin']) ? trim((string) $requestData['pin']) : '';

        if ($pin === '') {
            return $this->json(['message' => 'Le code PIN est requis pour d?verrouiller cet ?l?ment.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (!$authenticatedUser instanceof User || !$authenticatedUser->hasPin() || !is_string($authenticatedUser->getPinHash()) || !password_verify($pin, $authenticatedUser->getPinHash())) {
            return $this->json(['message' => 'Le code PIN fourni est invalide.'], Response::HTTP_FORBIDDEN);
        }

        return $this->json(['secret' => $decryptedSecret]);
    }

    #[OA\Patch(
        path: '/api/items/{itemId}',
        summary: 'Met ? jour un ?l?ment.',
        security: [['Bearer' => []]],
        tags: ['Ã‰l?ments'],
        parameters: [
            new OA\Parameter(name: 'itemId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Facebook pro'),
                    new OA\Property(property: 'username', type: 'string', nullable: true, example: 'john'),
                    new OA\Property(property: 'secret', type: 'string', nullable: true, example: 'motdepassefort'),
                    new OA\Property(property: 'notes', type: 'string', nullable: true),
                    new OA\Property(property: 'isSensitive', type: 'boolean', example: true),
                    new OA\Property(property: 'uris', type: 'array', items: new OA\Items(type: 'object')),
                    new OA\Property(property: 'customFields', type: 'array', items: new OA\Items(type: 'object')),
                ],
                type: 'object'
            )
        )
    )]
    #[OA\Response(response: 200, description: 'Ã‰l?ment mis ? jour.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'Acc?s interdit.')]
    #[OA\Response(response: 404, description: 'Ã‰l?ment introuvable.')]
    #[OA\Response(response: 422, description: 'Donn?es invalides.')]
    #[Route('/items/{itemId}', name: 'update', methods: ['PATCH'], requirements: ['itemId' => '\\d+'])]
    public function update(
        int $itemId,
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        VaultItemRepository $vaultItemRepository,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $item = $this->resolveItem($itemId, $vaultItemRepository, $authenticatedUser);

        if ($item instanceof JsonResponse) {
            return $item;
        }

        if (!$this->isGranted(ItemVoter::EDIT, $item)) {
            return $this->json(['message' => 'Acc?s interdit.'], Response::HTTP_FORBIDDEN);
        }

        $requestData = $this->decodeJsonRequest($request);

        if ($requestData instanceof JsonResponse) {
            return $requestData;
        }

        $input = new UpdateVaultItemInput();
        $input->name = isset($requestData['name']) ? (string) $requestData['name'] : null;
        $input->username = isset($requestData['username']) ? (string) $requestData['username'] : null;
        $input->secret = array_key_exists('secret', $requestData) ? (string) $requestData['secret'] : null;
        $input->notes = isset($requestData['notes']) ? (string) $requestData['notes'] : null;
        $input->isSensitive = (bool) ($requestData['isSensitive'] ?? false);
        $input->uris = is_array($requestData['uris'] ?? null) ? $requestData['uris'] : [];
        $input->customFields = is_array($requestData['customFields'] ?? null) ? $requestData['customFields'] : [];
        $itemPermissions = array_key_exists('itemPermissions', $requestData) && is_array($requestData['itemPermissions'])
            ? $requestData['itemPermissions']
            : null;

        $errors = $this->formatViolations($validator->validate($input));
        $this->validateUris($input->uris, $errors);
        $this->validateCustomFields($input->customFields, $errors);
        if (is_array($itemPermissions)) {
            $this->validateItemPermissions($item->getVault(), $itemPermissions, $errors);
        }

        if ($errors !== []) {
            return $this->json(['message' => 'Les donn?es fournies sont invalides.', 'errors' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $item
            ->setName((string) $input->name)
            ->setUsername($input->username)
            ->setSecret($this->secretCipher->encrypt($input->secret))
            ->setIsSensitive($input->isSensitive)
            ->setNotes($input->notes);

        $this->syncUris($item, $input->uris);
        $this->syncCustomFields($item, $input->customFields);
        if (is_array($itemPermissions)) {
            $this->syncItemPermissions($item, $item->getVault(), $itemPermissions);
        }

        $entityManager->flush();

        return $this->json(['item' => $this->buildItemPayload($item, true)]);
    }

    #[OA\Delete(
        path: '/api/items/{itemId}',
        summary: 'Supprime un ?l?ment.',
        security: [['Bearer' => []]],
        tags: ['Ã‰l?ments'],
        parameters: [
            new OA\Parameter(name: 'itemId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ]
    )]
    #[OA\Response(response: 200, description: 'Ã‰l?ment supprim?.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'Acc?s interdit.')]
    #[OA\Response(response: 404, description: 'Ã‰l?ment introuvable.')]
    #[Route('/items/{itemId}', name: 'delete', methods: ['DELETE'], requirements: ['itemId' => '\\d+'])]
    public function delete(int $itemId, #[CurrentUser] ?User $authenticatedUser, VaultItemRepository $vaultItemRepository, EntityManagerInterface $entityManager): JsonResponse
    {
        $item = $this->resolveItem($itemId, $vaultItemRepository, $authenticatedUser);

        if ($item instanceof JsonResponse) {
            return $item;
        }

        if (!$this->isGranted(ItemVoter::DELETE, $item)) {
            return $this->json(['message' => 'Acc?s interdit.'], Response::HTTP_FORBIDDEN);
        }

        $entityManager->remove($item);
        $entityManager->flush();

        return $this->json(['message' => 'Ã‰l?ment supprim?.']);
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

    private function resolveItem(int $itemId, VaultItemRepository $vaultItemRepository, ?User $authenticatedUser): VaultItem|JsonResponse
    {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $item = $vaultItemRepository->find($itemId);

        if (!$item instanceof VaultItem) {
            return $this->json(['message' => 'Ã‰l?ment introuvable.'], Response::HTTP_NOT_FOUND);
        }

        return $item;
    }

    private function decodeJsonRequest(Request $request): array|JsonResponse
    {
        $requestContent = $request->getContent();

        if ($requestContent === '') {
            return new JsonResponse(['message' => 'Le corps de la requ?te JSON est requis.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $decodedRequestData = json_decode($requestContent, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return new JsonResponse(['message' => 'Le JSON fourni est invalide.'], Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($decodedRequestData)) {
            return new JsonResponse(['message' => 'Le corps de la requ?te doit ?tre un objet JSON.'], Response::HTTP_BAD_REQUEST);
        }

        return $decodedRequestData;
    }

    private function formatViolations(iterable $constraintViolations): array
    {
        $validationErrors = [];

        foreach ($constraintViolations as $constraintViolation) {
            $fieldName = $constraintViolation->getPropertyPath() ?: 'global';
            $validationErrors[$fieldName][] = $constraintViolation->getMessage();
        }

        return $validationErrors;
    }

    private function validateUris(array $uris, array &$errors): void
    {
        foreach ($uris as $index => $uriData) {
            $uriValue = is_string($uriData['uri'] ?? null) ? $this->normalizeUri($uriData['uri']) : '';

            if ($uriValue === '') {
                $errors[sprintf('uris.%d.uri', $index)][] = 'URL requise.';
                continue;
            }

            if (filter_var($uriValue, FILTER_VALIDATE_URL) === false) {
                $errors[sprintf('uris.%d.uri', $index)][] = 'URL invalide.';
            }
        }
    }

    private function validateCustomFields(array $customFields, array &$errors): void
    {
        foreach ($customFields as $index => $fieldData) {
            $label = is_string($fieldData['label'] ?? null) ? trim($fieldData['label']) : '';

            if ($label === '') {
                $errors[sprintf('customFields.%d.label', $index)][] = 'Le libell? du champ personnalis? est obligatoire.';
            }
        }
    }

    private function syncUris(VaultItem $item, array $uris): void
    {
        foreach ($item->getUris()->toArray() as $existingUri) {
            $item->removeUri($existingUri);
        }

        foreach ($uris as $uriData) {
            $item->addUri(
                (new ItemUri())
                    ->setLabel(is_string($uriData['label'] ?? null) ? $uriData['label'] : null)
                    ->setUri($this->normalizeUri(is_string($uriData['uri'] ?? null) ? $uriData['uri'] : ''))
            );
        }
    }

    private function syncCustomFields(VaultItem $item, array $customFields): void
    {
        foreach ($item->getCustomFields()->toArray() as $existingField) {
            $item->removeCustomField($existingField);
        }

        foreach ($customFields as $fieldData) {
            $item->addCustomField(
                (new CustomField())
                    ->setLabel((string) ($fieldData['label'] ?? ''))
                    ->setType(is_string($fieldData['type'] ?? null) ? $fieldData['type'] : 'text')
                    ->setValue(is_string($fieldData['value'] ?? null) ? $fieldData['value'] : null)
                    ->setIsSensitive((bool) ($fieldData['isSensitive'] ?? false))
            );
        }
    }

    private function validateItemPermissions(Vault $vault, array $itemPermissions, array &$errors): void
    {
        $availableMemberIds = [];
        $seenUserIds = [];

        foreach ($vault->getMembers() as $member) {
            $memberUser = $member->getUser();

            if ($memberUser === null || $vault->getOwner()?->getId() === $memberUser->getId()) {
                continue;
            }

            $availableMemberIds[] = $memberUser->getId();
        }

        foreach ($itemPermissions as $index => $permissionData) {
            $userId = isset($permissionData['userId']) ? (int) $permissionData['userId'] : 0;

            if ($userId <= 0) {
                $errors[sprintf('itemPermissions.%d.userId', $index)][] = 'Le membre cibl? est obligatoire.';
                continue;
            }

            if (in_array($userId, $seenUserIds, true)) {
                $errors[sprintf('itemPermissions.%d.userId', $index)][] = 'Ce membre est d?j? pr?sent dans les permissions fines.';
            }

            $seenUserIds[] = $userId;

            if (!in_array($userId, $availableMemberIds, true)) {
                $errors[sprintf('itemPermissions.%d.userId', $index)][] = 'Ce membre ne peut pas recevoir de droits fins sur cet ?l?ment.';
            }
        }
    }

    private function syncItemPermissions(VaultItem $item, ?Vault $vault, array $itemPermissions): void
    {
        if (!$vault instanceof Vault) {
            return;
        }

        foreach ($item->getItemPermissions()->toArray() as $existingPermission) {
            $item->removeItemPermission($existingPermission);
        }

        $membersByUserId = [];
        foreach ($vault->getMembers() as $member) {
            $memberUser = $member->getUser();

            if ($memberUser === null || $vault->getOwner()?->getId() === $memberUser->getId()) {
                continue;
            }

            $membersByUserId[$memberUser->getId()] = $memberUser;
        }

        foreach ($itemPermissions as $permissionData) {
            $userId = isset($permissionData['userId']) ? (int) $permissionData['userId'] : 0;
            $memberUser = $membersByUserId[$userId] ?? null;

            if (!$memberUser instanceof User) {
                continue;
            }

            $canView = (bool) ($permissionData['canView'] ?? true);
            $canEdit = (bool) ($permissionData['canEdit'] ?? false);
            $canManageAttachments = (bool) ($permissionData['canManageAttachments'] ?? false);
            $canRevealSecret = (bool) ($permissionData['canRevealSecret'] ?? true);

            // Les droits avanc?s restent toujours rattach?s ? la lecture de l??l?ment.
            if ($canEdit || $canManageAttachments || $canRevealSecret) {
                $canView = true;
            }

            $item->addItemPermission(
                (new ItemPermission())
                    ->setUser($memberUser)
                    ->setCanView($canView)
                    ->setCanEdit($canEdit)
                    ->setCanManageAttachments($canManageAttachments)
                    ->setCanRevealSecret($canRevealSecret)
            );
        }
    }

    private function normalizeUri(string $uri): string
    {
        $normalizedUri = trim($uri);

        if ($normalizedUri === '') {
            return '';
        }

        if (!preg_match('#^[a-z][a-z0-9+.-]*://#i', $normalizedUri)) {
            return sprintf('https://%s', ltrim($normalizedUri, '/'));
        }

        return $normalizedUri;
    }

    private function buildItemPayload(VaultItem $item, bool $includeSecret): array
    {
        $decryptedSecret = $this->secretCipher->decrypt($item->getSecret());
        // Le secret brut n'est renvoy? qu'en lecture explicite et seulement pour un item non sensible.
        $shouldExposeSecret = $includeSecret && !$item->isSensitive() && $decryptedSecret !== null;
        $vault = $item->getVault();
        $ownerId = $vault?->getOwner()?->getId();
        $memberOptions = [];

        foreach ($vault?->getMembers() ?? [] as $member) {
            // Le propri?taire n'a pas de permission fine d?di?e.
            if ($member->getUser()?->getId() === $ownerId) {
                continue;
            }

            $memberOptions[] = [
                'userId' => $member->getUser()?->getId(),
                'displayName' => $member->getUser()?->getDisplayName(),
                'role' => $member->getRole()->value,
            ];
        }

        return [
            'id' => $item->getId(),
            'vaultId' => $item->getVault()?->getId(),
            'name' => $item->getName(),
            'type' => $item->getType()->value,
            'username' => $item->getUsername(),
            'secret' => $shouldExposeSecret ? $decryptedSecret : null,
            'hasSecret' => $decryptedSecret !== null,
            'isSensitive' => $item->isSensitive(),
            'notes' => $item->getNotes(),
            'createdAt' => $item->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $item->getUpdatedAt()->format(\DateTimeInterface::ATOM),
            'uris' => array_map(
                static fn (ItemUri $uri) => [
                    'id' => $uri->getId(),
                    'label' => $uri->getLabel(),
                    'uri' => $uri->getUri(),
                ],
                $item->getUris()->toArray()
            ),
            'customFields' => array_map(
                static fn (CustomField $customField) => [
                    'id' => $customField->getId(),
                    'label' => $customField->getLabel(),
                    'type' => $customField->getType(),
                    'value' => $customField->getValue(),
                    'isSensitive' => $customField->isSensitive(),
                ],
                $item->getCustomFields()->toArray()
            ),
            'attachments' => array_map(
                static fn (Attachment $attachment) => [
                    'id' => $attachment->getId(),
                    'name' => $attachment->getOriginalName(),
                    'mimeType' => $attachment->getMimeType(),
                    'size' => $attachment->getSize(),
                    'createdAt' => $attachment->getCreatedAt()->format(\DateTimeInterface::ATOM),
                    'downloadUrl' => sprintf('/api/attachments/%d/download', $attachment->getId()),
                ],
                $item->getAttachments()->toArray()
            ),
            'itemPermissions' => array_map(
                static fn (ItemPermission $permission) => [
                    'id' => $permission->getId(),
                    'user' => [
                        'id' => $permission->getUser()?->getId(),
                        'displayName' => $permission->getUser()?->getDisplayName(),
                    ],
                    'canView' => $permission->canView(),
                    'canEdit' => $permission->canEdit(),
                    'canManageAttachments' => $permission->canManageAttachments(),
                    'canRevealSecret' => $permission->canRevealSecret(),
                ],
                $item->getItemPermissions()->toArray()
            ),
            'memberOptions' => $memberOptions,
            'access' => [
                'canEdit' => $this->isGranted(ItemVoter::EDIT, $item),
                'canDelete' => $this->isGranted(ItemVoter::DELETE, $item),
                'canManageAttachments' => $this->isGranted(ItemVoter::MANAGE_ATTACHMENTS, $item),
                'canRevealSecret' => $this->isGranted(ItemVoter::REVEAL_SECRET, $item),
            ],
        ];
    }
}


