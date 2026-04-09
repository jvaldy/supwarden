<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;
use App\Entity\Vault;
use App\Entity\VaultMessage;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<VaultMessage>
 */
class VaultMessageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, VaultMessage::class);
    }

    /**
     * @return list<VaultMessage>
     */
    public function findRecentForVault(Vault $vault, int $limit = 80, ?\DateTimeImmutable $since = null, ?\DateTimeImmutable $before = null): array
    {
        $queryBuilder = $this->createQueryBuilder('message')
            ->where('message.vault = :vault')
            ->setParameter('vault', $vault)
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
     * @param array<int, \DateTimeImmutable|null> $lastReadByVaultId
     * @return array<int, int>
     */
    public function findUnreadCountsByVaultForUser(User $user, array $lastReadByVaultId): array
    {
        if ($lastReadByVaultId === []) {
            return [];
        }

        $queryBuilder = $this->createQueryBuilder('message')
            ->select('IDENTITY(message.vault) AS vaultId', 'COUNT(message.id) AS unreadCount')
            ->where('IDENTITY(message.vault) IN (:vaultIds)')
            ->andWhere('message.author != :user')
            ->setParameter('vaultIds', array_keys($lastReadByVaultId))
            ->setParameter('user', $user)
            ->groupBy('message.vault');

        $orX = $queryBuilder->expr()->orX();
        foreach ($lastReadByVaultId as $vaultId => $lastReadAt) {
            $vaultParameterName = 'vaultId' . $vaultId;
            $queryBuilder->setParameter($vaultParameterName, $vaultId);

            if ($lastReadAt instanceof \DateTimeImmutable) {
                $lastReadParameterName = 'lastReadAt' . $vaultId;
                $orX->add(sprintf('(IDENTITY(message.vault) = :%s AND message.createdAt > :%s)', $vaultParameterName, $lastReadParameterName));
                $queryBuilder->setParameter($lastReadParameterName, $lastReadAt);
            } else {
                $orX->add(sprintf('IDENTITY(message.vault) = :%s', $vaultParameterName));
            }
        }

        $queryBuilder->andWhere($orX);

        $rows = $queryBuilder->getQuery()->getArrayResult();

        $counts = [];
        foreach ($rows as $row) {
            $vaultId = (int) ($row['vaultId'] ?? 0);
            if ($vaultId <= 0) {
                continue;
            }

            $counts[$vaultId] = (int) ($row['unreadCount'] ?? 0);
        }

        return $counts;
    }

    public function countByAuthor(User $author): int
    {
        return (int) $this->createQueryBuilder('message')
            ->select('COUNT(message.id)')
            ->where('message.author = :author')
            ->setParameter('author', $author)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
