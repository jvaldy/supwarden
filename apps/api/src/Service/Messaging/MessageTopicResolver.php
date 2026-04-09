<?php

declare(strict_types=1);

namespace App\Service\Messaging;

use App\Entity\User;
use App\Entity\Vault;

final class MessageTopicResolver
{
    public function resolveVaultTopic(Vault $vault): string
    {
        return sprintf('/messages/vaults/%d', $vault->getId());
    }

    public function resolvePrivateTopic(User $userA, User $userB): string
    {
        $firstId = min($userA->getId() ?? 0, $userB->getId() ?? 0);
        $secondId = max($userA->getId() ?? 0, $userB->getId() ?? 0);

        return sprintf('/messages/private/%d-%d', $firstId, $secondId);
    }
}

