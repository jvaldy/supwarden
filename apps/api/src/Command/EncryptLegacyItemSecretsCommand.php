<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\VaultItem;
use App\Service\VaultSecretCipher;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:items:encrypt-legacy-secrets',
    description: 'Chiffre les secrets d’items encore stockés en clair.',
)]
final class EncryptLegacyItemSecretsCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly VaultSecretCipher $secretCipher,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $items = $this->entityManager
            ->createQueryBuilder()
            ->select('item')
            ->from(VaultItem::class, 'item')
            ->where('item.secret IS NOT NULL')
            ->andWhere('item.secret NOT LIKE :prefix')
            ->setParameter('prefix', 'enc:v1:%')
            ->getQuery()
            ->getResult();

        if ($items === []) {
            $io->success('Aucun secret legacy en clair à chiffrer.');

            return Command::SUCCESS;
        }

        $updatedCount = 0;

        foreach ($items as $item) {
            if (!$item instanceof VaultItem) {
                continue;
            }

            $cipheredSecret = $this->secretCipher->encrypt($item->getSecret());

            if ($cipheredSecret === null) {
                continue;
            }

            $item->setSecret($cipheredSecret);
            ++$updatedCount;
        }

        $this->entityManager->flush();

        $io->success(sprintf('%d secret(s) legacy chiffré(s) avec succès.', $updatedCount));

        return Command::SUCCESS;
    }
}
