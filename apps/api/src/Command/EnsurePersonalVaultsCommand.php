<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\User;
use App\Entity\Vault;
use App\Entity\VaultMember;
use App\Enum\VaultMemberRole;
use App\Enum\VaultType;
use App\Repository\UserRepository;
use App\Repository\VaultMemberRepository;
use App\Repository\VaultRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:ensure:personal-vaults',
    description: 'Cree ou corrige le trousseau personnel systeme de chaque utilisateur.',
)]
final class EnsurePersonalVaultsCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserRepository $userRepository,
        private readonly VaultRepository $vaultRepository,
        private readonly VaultMemberRepository $vaultMemberRepository,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $createdCount = 0;
        $updatedCount = 0;

        foreach ($this->userRepository->findAllOrderedByCreationDateDesc() as $user) {
            $personalVault = $this->findSystemPersonalVault($user);

            if (!$personalVault instanceof Vault) {
                $personalVault = (new Vault())
                    ->setName('Trousseau personnel')
                    ->setOwner($user);

                $ownerMembership = (new VaultMember())
                    ->setUser($user)
                    ->setRole(VaultMemberRole::OWNER);

                $personalVault->addMember($ownerMembership);
                $this->entityManager->persist($personalVault);
                ++$createdCount;
                continue;
            }

            $wasUpdated = false;

            $ownerMembership = $this->vaultMemberRepository->findOneByVaultAndUser($personalVault, $user);
            if (!$ownerMembership instanceof VaultMember) {
                $ownerMembership = (new VaultMember())
                    ->setUser($user)
                    ->setRole(VaultMemberRole::OWNER);

                $personalVault->addMember($ownerMembership);
                $wasUpdated = true;
            }

            if ($wasUpdated) {
                ++$updatedCount;
            }
        }

        $this->entityManager->flush();

        $io->success(sprintf(
            'Trousseaux personnels assures: %d crees, %d corriges.',
            $createdCount,
            $updatedCount
        ));

        return Command::SUCCESS;
    }

    private function findSystemPersonalVault(User $user): ?Vault
    {
        foreach ($this->vaultRepository->findOwnedVaultsForUser($user) as $vault) {
            if ($vault->getType() === VaultType::PERSONAL && mb_strtolower(trim($vault->getName())) === 'trousseau personnel') {
                return $vault;
            }
        }

        return null;
    }
}
