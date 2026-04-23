<?php

declare(strict_types=1);

namespace App\Service\Notification;

use App\Entity\User;

final class NotificationTopicResolver
{
    public function __construct(private readonly string $appSecret)
    {
    }

    public function resolveUserTopic(User $user): string
    {
        $signature = hash_hmac('sha256', sprintf('notifications:%d', $user->getId()), $this->appSecret);

        return sprintf('/notifications/users/%d/%s', $user->getId(), $signature);
    }
}
