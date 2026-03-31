<?php

namespace App\Security\Vault;

use App\Entity\User;
use App\Entity\Vault;
use App\Entity\VaultMember;
use App\Enum\VaultMemberRole;
use App\Repository\VaultMemberRepository;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class VaultVoter extends Voter
{
    public const VIEW = 'VAULT_VIEW';
    public const EDIT = 'VAULT_EDIT';
    public const DELETE = 'VAULT_DELETE';
    public const MANAGE_MEMBERS = 'VAULT_MANAGE_MEMBERS';

    public function __construct(
        private readonly VaultMemberRepository $vaultMemberRepository
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return $subject instanceof Vault && in_array($attribute, [
            self::VIEW,
            self::EDIT,
            self::DELETE,
            self::MANAGE_MEMBERS,
        ], true);
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $authenticatedUser = $token->getUser();

        if (!$authenticatedUser instanceof User || !$subject instanceof Vault) {
            return false;
        }

        if ($subject->getOwner()?->getId() === $authenticatedUser->getId()) {
            return true;
        }

        $vaultMember = $this->vaultMemberRepository->findOneByVaultAndUser($subject, $authenticatedUser);

        if (!$vaultMember instanceof VaultMember) {
            return false;
        }

        return match ($attribute) {
            self::VIEW => true,
            self::EDIT => in_array($vaultMember->getRole(), [VaultMemberRole::OWNER, VaultMemberRole::EDITOR], true),
            self::DELETE => false,
            self::MANAGE_MEMBERS => $vaultMember->getRole() === VaultMemberRole::OWNER,
            default => false,
        };
    }
}
