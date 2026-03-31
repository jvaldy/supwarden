<?php

declare(strict_types=1);

namespace App\Controller\Vault;

use App\Dto\Vault\AddVaultMemberInput;
use App\Dto\Vault\UpdateVaultMemberInput;
use App\Entity\User;
use App\Entity\Vault;
use App\Entity\VaultMember;
use App\Enum\VaultMemberRole;
use App\Repository\UserRepository;
use App\Repository\VaultMemberRepository;
use App\Repository\VaultRepository;
use App\Security\Vault\VaultVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Validator\ConstraintViolationInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/vaults/{vaultId}/members', name: 'api_vault_members_')]
final class VaultMemberController extends AbstractController
{
    #[Route('', name: 'list', methods: ['GET'], requirements: ['vaultId' => '\\d+'])]
    // Retourne la liste des membres pour un trousseau déjà accessible.
    public function list(
        int $vaultId,
        #[CurrentUser] ?User $authenticatedUser,
        VaultRepository $vaultRepository
    ): JsonResponse {
        $vault = $this->resolveAccessibleVault($vaultId, $authenticatedUser, $vaultRepository, VaultVoter::VIEW);

        if ($vault instanceof JsonResponse) {
            return $vault;
        }

        return $this->json([
            'members' => array_map([$this, 'buildMemberPayload'], $vault->getMembers()->toArray()),
        ]);
    }

    #[Route('', name: 'create', methods: ['POST'], requirements: ['vaultId' => '\\d+'])]
    // Ajoute un membre à un trousseau et laisse son type évoluer automatiquement.
    public function create(
        int $vaultId,
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        VaultRepository $vaultRepository,
        VaultMemberRepository $vaultMemberRepository,
        UserRepository $userRepository,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $vault = $this->resolveAccessibleVault($vaultId, $authenticatedUser, $vaultRepository, VaultVoter::MANAGE_MEMBERS);

        if ($vault instanceof JsonResponse) {
            return $vault;
        }

        $requestData = $this->decodeJsonRequest($request);

        if ($requestData instanceof JsonResponse) {
            return $requestData;
        }

        $input = new AddVaultMemberInput();
        $input->email = (string) ($requestData['email'] ?? '');
        $input->role = (string) ($requestData['role'] ?? '');

        $validationErrors = $this->formatViolations($validator->validate($input));

        $userToAdd = $userRepository->findOneByEmail($input->email);

        if (!$userToAdd instanceof User) {
            $validationErrors['email'][] = 'Aucun utilisateur ne correspond Ã  cette adresse e-mail.';
        } elseif ($vaultMemberRepository->findOneByVaultAndUser($vault, $userToAdd) instanceof VaultMember) {
            $validationErrors['email'][] = 'Ce membre appartient dÃ©jÃ  Ã  ce trousseau.';
        }

        if ($validationErrors !== []) {
            return $this->json([
                'message' => 'Les donnÃ©es fournies sont invalides.',
                'errors' => $validationErrors,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $member = (new VaultMember())
            ->setUser($userToAdd)
            ->setRole(VaultMemberRole::from($input->role));

        $vault->addMember($member);
        $entityManager->flush();

        return $this->json([
            'member' => $this->buildMemberPayload($member),
            'vaultType' => $vault->getType()->value,
        ], Response::HTTP_CREATED);
    }

    #[Route('/{memberId}', name: 'update', methods: ['PATCH'], requirements: ['vaultId' => '\\d+', 'memberId' => '\\d+'])]
    // Met à jour le rôle d’un membre tant que le propriétaire garde la main sur le rôle OWNER.
    public function update(
        int $vaultId,
        int $memberId,
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        VaultRepository $vaultRepository,
        VaultMemberRepository $vaultMemberRepository,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $vault = $this->resolveAccessibleVault($vaultId, $authenticatedUser, $vaultRepository, VaultVoter::MANAGE_MEMBERS);

        if ($vault instanceof JsonResponse) {
            return $vault;
        }

        $member = $vaultMemberRepository->find($memberId);

        if (!$member instanceof VaultMember || $member->getVault()?->getId() !== $vault->getId()) {
            return $this->json(['message' => 'Membre introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $requestData = $this->decodeJsonRequest($request);

        if ($requestData instanceof JsonResponse) {
            return $requestData;
        }

        $input = new UpdateVaultMemberInput();
        $input->role = (string) ($requestData['role'] ?? '');

        $validationErrors = $this->formatViolations($validator->validate($input));

        if ($member->getRole() === VaultMemberRole::OWNER) {
            $validationErrors['role'][] = 'Le rÃ´le OWNER ne peut pas Ãªtre modifiÃ© depuis la gestion des membres.';
        }

        if ($validationErrors !== []) {
            return $this->json([
                'message' => 'Les donnÃ©es fournies sont invalides.',
                'errors' => $validationErrors,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $member->setRole(VaultMemberRole::from($input->role));
        $entityManager->flush();

        return $this->json([
            'member' => $this->buildMemberPayload($member),
        ]);
    }

    #[Route('/{memberId}', name: 'delete', methods: ['DELETE'], requirements: ['vaultId' => '\\d+', 'memberId' => '\\d+'])]
    // Retire un membre du trousseau ou permet à un membre non propriétaire de le quitter.
    public function delete(
        int $vaultId,
        int $memberId,
        #[CurrentUser] ?User $authenticatedUser,
        VaultRepository $vaultRepository,
        VaultMemberRepository $vaultMemberRepository,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $vault = $vaultRepository->find($vaultId);

        if (!$vault instanceof Vault) {
            return $this->json(['message' => 'Trousseau introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $member = $vaultMemberRepository->find($memberId);

        if (!$member instanceof VaultMember || $member->getVault()?->getId() !== $vault->getId()) {
            return $this->json(['message' => 'Membre introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if ($member->getRole() === VaultMemberRole::OWNER) {
            return $this->json([
                'message' => 'Le propriÃ©taire ne peut pas Ãªtre retirÃ© depuis la gestion des membres.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $isSelfRemoval = $member->getUser()?->getId() === $authenticatedUser->getId();

        if (!$isSelfRemoval && !$this->isGranted(VaultVoter::MANAGE_MEMBERS, $vault)) {
            return $this->json(['message' => 'AccÃ¨s interdit.'], Response::HTTP_FORBIDDEN);
        }

        if ($isSelfRemoval && !$this->isGranted(VaultVoter::VIEW, $vault)) {
            return $this->json(['message' => 'AccÃ¨s interdit.'], Response::HTTP_FORBIDDEN);
        }

        $vault->removeMember($member);
        $entityManager->flush();

        return $this->json([
            'message' => $isSelfRemoval
                ? 'Vous avez bien quittÃ© ce trousseau.'
                : 'Le membre a bien Ã©tÃ© retirÃ© du trousseau.',
            'vaultType' => $vault->getType()->value,
        ]);
    }

    /**
     * @return Vault|JsonResponse
     */
    private function resolveAccessibleVault(
        int $vaultId,
        ?User $authenticatedUser,
        VaultRepository $vaultRepository,
        string $requiredPermission
    ): Vault|JsonResponse {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $vault = $vaultRepository->find($vaultId);

        if (!$vault instanceof Vault) {
            return $this->json(['message' => 'Trousseau introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if (!$this->isGranted($requiredPermission, $vault)) {
            return $this->json(['message' => 'AccÃ¨s interdit.'], Response::HTTP_FORBIDDEN);
        }

        return $vault;
    }

    /**
     * @return array<string, mixed>|JsonResponse
     */
    private function decodeJsonRequest(Request $request): array|JsonResponse
    {
        $requestContent = $request->getContent();

        if ($requestContent === '') {
            return new JsonResponse(['message' => 'Le corps de la requÃªte JSON est requis.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $decodedRequestData = json_decode($requestContent, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return new JsonResponse(['message' => 'Le JSON fourni est invalide.'], Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($decodedRequestData)) {
            return new JsonResponse(['message' => 'Le corps de la requÃªte doit Ãªtre un objet JSON.'], Response::HTTP_BAD_REQUEST);
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
     * @return array<string, mixed>
     */
    private function buildMemberPayload(VaultMember $member): array
    {
        return [
            'id' => $member->getId(),
            'role' => $member->getRole()->value,
            'createdAt' => $member->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'user' => [
                'id' => $member->getUser()?->getId(),
                'email' => $member->getUser()?->getEmail(),
                'displayName' => $member->getUser()?->getDisplayName(),
            ],
        ];
    }
}
