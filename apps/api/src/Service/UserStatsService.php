<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Enum\VaultType;
use App\Repository\VaultRepository;

final class UserStatsService
{
    public function __construct(private readonly VaultRepository $vaultRepository)
    {
    }

    /**
     * @return array<string,mixed>
     */
    public function buildUserStats(User $user): array
    {
        $vaults = $this->vaultRepository->findAccessibleVaultsForUser($user);

        $createdVaultsCount = 0;
        $joinedVaultsCount = 0;
        $sharedVaultsCount = 0;
        $totalItemsCount = 0;
        $createdItemsCount = 0;
        $sensitiveItemsCount = 0;
        $invitedMembersCount = 0;

        foreach ($vaults as $vault) {
            $isOwner = $vault->getOwner()?->getId() === $user->getId();

            if ($isOwner) {
                ++$createdVaultsCount;
            } else {
                ++$joinedVaultsCount;
            }

            if ($vault->getType() === VaultType::SHARED) {
                ++$sharedVaultsCount;
            }

            $vaultItemsCount = count($vault->getItems());
            $totalItemsCount += $vaultItemsCount;

            if ($isOwner) {
                $createdItemsCount += $vaultItemsCount;
            }

            foreach ($vault->getItems() as $item) {
                if ($item->isSensitive()) {
                    ++$sensitiveItemsCount;
                }
            }

            if ($isOwner) {
                foreach ($vault->getMembers() as $member) {
                    $memberUser = $member->getUser();
                    if ($memberUser?->getId() !== null && $memberUser->getId() !== $user->getId()) {
                        ++$invitedMembersCount;
                    }
                }
            }
        }

        $exportsCount = method_exists($user, 'getExportCount') ? $user->getExportCount() : 0;
        $lastExportAt = method_exists($user, 'getLastExportAt') ? $user->getLastExportAt() : null;
        $importsCount = method_exists($user, 'getImportCount') ? $user->getImportCount() : 0;
        $lastImportAt = method_exists($user, 'getLastImportAt') ? $user->getLastImportAt() : null;

        return [
            'createdVaultsCount' => $createdVaultsCount,
            'joinedVaultsCount' => $joinedVaultsCount,
            'totalItemsCount' => $totalItemsCount,
            'createdItemsCount' => $createdItemsCount,
            'sensitiveItemsCount' => $sensitiveItemsCount,
            'sharedVaultsCount' => $sharedVaultsCount,
            'invitedMembersCount' => $invitedMembersCount,
            'exportsCount' => $exportsCount,
            'lastExportAt' => $lastExportAt?->format(\DateTimeInterface::ATOM),
            'importsCount' => $importsCount,
            'lastImportAt' => $lastImportAt?->format(\DateTimeInterface::ATOM),
            'generatedAt' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ];
    }
}
