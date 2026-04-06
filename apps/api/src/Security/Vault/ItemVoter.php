<?php

declare(strict_types=1);

namespace App\Security\Vault;

use App\Entity\ItemPermission;
use App\Entity\User;
use App\Entity\Vault;
use App\Entity\VaultItem;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

final class ItemVoter extends Voter
{
    public const VIEW = 'ITEM_VIEW';
    public const EDIT = 'ITEM_EDIT';
    public const DELETE = 'ITEM_DELETE';
    public const MANAGE_ATTACHMENTS = 'ITEM_MANAGE_ATTACHMENTS';
    public const REVEAL_SECRET = 'ITEM_REVEAL_SECRET';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return $subject instanceof VaultItem && in_array($attribute, [
            self::VIEW,
            self::EDIT,
            self::DELETE,
            self::MANAGE_ATTACHMENTS,
            self::REVEAL_SECRET,
        ], true);
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $authenticatedUser = $token->getUser();

        if (!$authenticatedUser instanceof User || !$subject instanceof VaultItem) {
            return false;
        }

        $vault = $subject->getVault();

        if (!$vault instanceof Vault) {
            return false;
        }

        if ($vault->getOwner()?->getId() === $authenticatedUser->getId()) {
            return true;
        }

        // Les droits fins ne s'appliquent qu'aux membres non proprietaires.
        $permission = $this->findPermission($subject, $authenticatedUser);

        return match ($attribute) {
            self::VIEW => $this->canView($authenticatedUser, $vault, $permission),
            self::EDIT => $this->canEdit($authenticatedUser, $vault, $permission),
            self::MANAGE_ATTACHMENTS => $this->canManageAttachments($authenticatedUser, $vault, $permission),
            self::REVEAL_SECRET => $this->canRevealSecret($authenticatedUser, $vault, $permission),
            self::DELETE => false,
            default => false,
        };
    }

    private function canView(User $authenticatedUser, Vault $vault, ?ItemPermission $permission): bool
    {
        $hasVaultAccess = $this->canViewVault($authenticatedUser, $vault);

        if (!$hasVaultAccess) {
            return false;
        }

        return $permission?->canView() ?? true;
    }

    private function canEdit(User $authenticatedUser, Vault $vault, ?ItemPermission $permission): bool
    {
        $hasVaultEditAccess = $this->canEditVault($authenticatedUser, $vault);

        if (!$hasVaultEditAccess) {
            return false;
        }

        return $permission?->canEdit() ?? true;
    }

    private function canManageAttachments(User $authenticatedUser, Vault $vault, ?ItemPermission $permission): bool
    {
        $hasVaultAttachmentAccess = $this->canEditVault($authenticatedUser, $vault);

        if (!$hasVaultAttachmentAccess) {
            return false;
        }

        return $permission?->canManageAttachments() ?? true;
    }

    private function canRevealSecret(User $authenticatedUser, Vault $vault, ?ItemPermission $permission): bool
    {
        $hasVaultViewAccess = $this->canViewVault($authenticatedUser, $vault);

        if (!$hasVaultViewAccess) {
            return false;
        }

        return $permission?->canRevealSecret() ?? true;
    }

    private function canViewVault(User $authenticatedUser, Vault $vault): bool
    {
        foreach ($vault->getMembers() as $member) {
            if ($member->getUser()?->getId() === $authenticatedUser->getId()) {
                return true;
            }
        }

        return false;
    }

    private function canEditVault(User $authenticatedUser, Vault $vault): bool
    {
        foreach ($vault->getMembers() as $member) {
            if (
                $member->getUser()?->getId() === $authenticatedUser->getId()
                && in_array($member->getRole()->value, ['OWNER', 'EDITOR'], true)
            ) {
                return true;
            }
        }

        return false;
    }

    private function findPermission(VaultItem $item, User $authenticatedUser): ?ItemPermission
    {
        foreach ($item->getItemPermissions() as $permission) {
            if ($permission->getUser()?->getId() === $authenticatedUser->getId()) {
                return $permission;
            }
        }

        return null;
    }
}
