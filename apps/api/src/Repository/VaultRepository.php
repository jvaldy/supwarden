<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\Vault;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Vault>
 */
class VaultRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Vault::class);
    }

    /**
     * @return list<Vault>
     */
    public function findAccessibleVaultsForUser(User $user, ?string $searchQuery = null): array
    {
        $queryBuilder = $this->createQueryBuilder('vault')
            ->select('vault')
            ->distinct()
            ->leftJoin('vault.members', 'member')
            ->where('IDENTITY(vault.owner) = :userId OR IDENTITY(member.user) = :userId')
            ->setParameter('userId', $user->getId())
            ->orderBy('vault.createdAt', 'DESC');

        if ($searchQuery !== null && trim($searchQuery) !== '') {
            $queryBuilder
                ->andWhere('LOWER(vault.name) LIKE :searchQuery')
                ->setParameter('searchQuery', '%' . mb_strtolower(trim($searchQuery)) . '%');
        }

        return $queryBuilder->getQuery()->getResult();
    }
}
