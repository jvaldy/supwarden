<?php

namespace App\Repository;

use App\Entity\Vault;
use App\Entity\VaultItem;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<VaultItem>
 */
class VaultItemRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, VaultItem::class);
    }

    /**
     * @return list<VaultItem>
     */
    public function findByVault(Vault $vault): array
    {
        return $this->createQueryBuilder('item')
            ->leftJoin('item.uris', 'uri')->addSelect('uri')
            ->leftJoin('item.customFields', 'customField')->addSelect('customField')
            ->leftJoin('item.attachments', 'attachment')->addSelect('attachment')
            ->leftJoin('item.itemPermissions', 'itemPermission')->addSelect('itemPermission')
            ->leftJoin('itemPermission.user', 'permissionUser')->addSelect('permissionUser')
            ->where('item.vault = :vault')
            ->setParameter('vault', $vault)
            ->orderBy('item.updatedAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
