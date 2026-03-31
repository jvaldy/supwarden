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
}
