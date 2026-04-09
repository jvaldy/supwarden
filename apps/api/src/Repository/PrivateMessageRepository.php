<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\PrivateMessage;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PrivateMessage>
 */
class PrivateMessageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PrivateMessage::class);
    }

    /**
     * @return list<PrivateMessage>
     */
    public function findConversation(User $userA, User $userB, int $limit = 80, ?\DateTimeImmutable $since = null, ?\DateTimeImmutable $before = null): array
    {
        $queryBuilder = $this->createQueryBuilder('message')
            ->where('(message.sender = :userA AND message.recipient = :userB) OR (message.sender = :userB AND message.recipient = :userA)')
            ->setParameter('userA', $userA)
            ->setParameter('userB', $userB)
            ->orderBy('message.createdAt', 'DESC')
            ->setMaxResults(max(1, min($limit, 200)));

        if ($since instanceof \DateTimeImmutable) {
            $queryBuilder
                ->andWhere('message.createdAt > :since')
                ->setParameter('since', $since);
        }

        if ($before instanceof \DateTimeImmutable) {
            $queryBuilder
                ->andWhere('message.createdAt < :before')
                ->setParameter('before', $before);
        }

        $messages = $queryBuilder->getQuery()->getResult();

        return array_reverse($messages);
    }

    /**
     * @return list<User>
     */
    public function findConversationUsers(User $user): array
    {
        $entityManager = $this->getEntityManager();

        $rows = $entityManager->createQuery(
            'SELECT DISTINCT IDENTITY(message.sender) AS senderId, IDENTITY(message.recipient) AS recipientId
             FROM App\\Entity\\PrivateMessage message
             WHERE message.sender = :user OR message.recipient = :user'
        )
            ->setParameter('user', $user)
            ->getArrayResult();

        $ids = [];
        foreach ($rows as $row) {
            $senderId = (int) ($row['senderId'] ?? 0);
            $recipientId = (int) ($row['recipientId'] ?? 0);
            if ($senderId > 0 && $senderId !== $user->getId()) {
                $ids[$senderId] = true;
            }
            if ($recipientId > 0 && $recipientId !== $user->getId()) {
                $ids[$recipientId] = true;
            }
        }

        if ($ids === []) {
            return [];
        }

        return $entityManager->getRepository(User::class)
            ->createQueryBuilder('user')
            ->where('user.id IN (:ids)')
            ->setParameter('ids', array_keys($ids))
            ->orderBy('user.firstname', 'ASC')
            ->addOrderBy('user.lastname', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return array<int, int>
     */
    public function findUnreadCountsForRecipient(User $recipient): array
    {
        $rows = $this->createQueryBuilder('message')
            ->select('IDENTITY(message.sender) AS senderId, COUNT(message.id) AS unreadCount')
            ->where('message.recipient = :recipient')
            ->andWhere('message.readAt IS NULL')
            ->setParameter('recipient', $recipient)
            ->groupBy('message.sender')
            ->getQuery()
            ->getArrayResult();

        $counts = [];
        foreach ($rows as $row) {
            $senderId = (int) ($row['senderId'] ?? 0);
            if ($senderId <= 0) {
                continue;
            }

            $counts[$senderId] = (int) ($row['unreadCount'] ?? 0);
        }

        return $counts;
    }

    public function countUnreadForRecipient(User $recipient): int
    {
        return (int) $this->createQueryBuilder('message')
            ->select('COUNT(message.id)')
            ->where('message.recipient = :recipient')
            ->andWhere('message.readAt IS NULL')
            ->setParameter('recipient', $recipient)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function markConversationAsRead(User $recipient, User $sender): int
    {
        return $this->createQueryBuilder('message')
            ->update()
            ->set('message.readAt', ':readAt')
            ->where('message.recipient = :recipient')
            ->andWhere('message.sender = :sender')
            ->andWhere('message.readAt IS NULL')
            ->setParameter('recipient', $recipient)
            ->setParameter('sender', $sender)
            ->setParameter('readAt', new \DateTimeImmutable())
            ->getQuery()
            ->execute();
    }

    public function countBySender(User $sender): int
    {
        return (int) $this->createQueryBuilder('message')
            ->select('COUNT(message.id)')
            ->where('message.sender = :sender')
            ->setParameter('sender', $sender)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
