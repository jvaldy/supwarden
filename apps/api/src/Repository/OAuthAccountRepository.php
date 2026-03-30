<?php

namespace App\Repository;

use App\Entity\OAuthAccount;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<OAuthAccount>
 */
class OAuthAccountRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, OAuthAccount::class);
    }

    public function findOneByProviderAndProviderUserId(string $provider, string $providerUserId): ?OAuthAccount
    {
        return $this->findOneBy([
            'provider' => trim($provider),
            'providerUserId' => trim($providerUserId),
        ]);
    }
}
