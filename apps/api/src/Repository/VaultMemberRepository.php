<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\Vault;
use App\Entity\VaultMember;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<VaultMember>
 */
class VaultMemberRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, VaultMember::class);
    }

    public function findOneByVaultAndUser(Vault $vault, User $user): ?VaultMember
    {
        return $this->findOneBy([
            'vault' => $vault,
            'user' => $user,
        ]);
    }

    /**
     * @return list<User>
     */
    public function findMessagingPeersForUser(User $user): array
    {
        $rows = $this->createQueryBuilder('membership')
            ->select('DISTINCT IDENTITY(peerMembership.user) AS peerUserId')
            ->innerJoin('membership.vault', 'vault')
            ->innerJoin('vault.members', 'peerMembership')
            ->where('membership.user = :user')
            ->andWhere('peerMembership.user != :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getArrayResult();

        $peerUserIds = array_values(array_filter(array_map(
            static fn (array $row): int => (int) ($row['peerUserId'] ?? 0),
            $rows
        )));

        if ($peerUserIds === []) {
            return [];
        }

        return $this->getEntityManager()
            ->getRepository(User::class)
            ->createQueryBuilder('user')
            ->where('user.id IN (:ids)')
            ->setParameter('ids', $peerUserIds)
            ->orderBy('user.firstname', 'ASC')
            ->addOrderBy('user.lastname', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return array<int, VaultMember>
     */
    public function findByUserIndexedByVaultId(User $user): array
    {
        $memberships = $this->createQueryBuilder('membership')
            ->innerJoin('membership.vault', 'vault')->addSelect('vault')
            ->where('membership.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();

        $indexed = [];
        foreach ($memberships as $membership) {
            if (!$membership instanceof VaultMember || !$membership->getVault()?->getId()) {
                continue;
            }

            $indexed[$membership->getVault()->getId()] = $membership;
        }

        return $indexed;
    }
}
