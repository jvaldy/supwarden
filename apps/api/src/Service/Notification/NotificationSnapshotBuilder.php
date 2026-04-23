<?php

declare(strict_types=1);

namespace App\Service\Notification;

use App\Entity\User;
use App\Repository\PrivateMessageRepository;
use App\Repository\VaultMemberRepository;
use App\Repository\VaultMessageRepository;

final class NotificationSnapshotBuilder
{
    public function __construct(
        private readonly PrivateMessageRepository $privateMessageRepository,
        private readonly VaultMemberRepository $vaultMemberRepository,
        private readonly VaultMessageRepository $vaultMessageRepository,
    ) {
    }

    /**
     * @return array{
     *   privateUnreadCount:int,
     *   vaultUnreadCount:int,
     *   vaultUnreadCountsById: array<int, int>
     * }
     */
    public function buildForUser(User $user): array
    {
        $memberships = $this->vaultMemberRepository->findByUserIndexedByVaultId($user);
        $lastReadByVaultId = [];

        foreach ($memberships as $vaultId => $membership) {
            $lastReadByVaultId[$vaultId] = $membership->getLastChatReadAt();
        }

        $vaultUnreadCountsById = $this->vaultMessageRepository->findUnreadCountsByVaultForUser($user, $lastReadByVaultId);

        return [
            'privateUnreadCount' => $this->privateMessageRepository->countUnreadForRecipient($user),
            'vaultUnreadCount' => array_sum($vaultUnreadCountsById),
            'vaultUnreadCountsById' => $vaultUnreadCountsById,
        ];
    }
}
