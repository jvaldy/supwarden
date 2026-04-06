<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ItemPermission;
use App\Entity\User;
use App\Entity\VaultItem;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ItemPermission>
 */
final class ItemPermissionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ItemPermission::class);
    }

    public function findOneForUser(VaultItem $item, User $user): ?ItemPermission
    {
        return $this->createQueryBuilder('permission')
            ->andWhere('permission.item = :item')
            ->andWhere('permission.user = :user')
            ->setParameter('item', $item)
            ->setParameter('user', $user)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
