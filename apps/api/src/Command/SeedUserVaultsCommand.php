<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\User;
use App\Entity\Vault;
use App\Entity\VaultItem;
use App\Repository\UserRepository;
use App\Repository\VaultRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:seed:user-vaults',
    description: 'Cree des trousseaux et elements de demonstration pour un utilisateur.',
)]
final class SeedUserVaultsCommand extends Command
{
    private const DEFAULT_USER = 'John Valdy Boungou';
    private const DEFAULT_VAULT_COUNT = 15;
    private const DEFAULT_ITEMS_PER_VAULT = 20;

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserRepository $userRepository,
        private readonly VaultRepository $vaultRepository,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('user', null, InputOption::VALUE_REQUIRED, 'Nom complet de l utilisateur cible.', self::DEFAULT_USER)
            ->addOption('vaults', null, InputOption::VALUE_REQUIRED, 'Nombre de trousseaux a creer.', (string) self::DEFAULT_VAULT_COUNT)
            ->addOption('items', null, InputOption::VALUE_REQUIRED, 'Nombre d elements par trousseau.', (string) self::DEFAULT_ITEMS_PER_VAULT)
            ->addOption('target-vault', null, InputOption::VALUE_REQUIRED, 'Nom exact du trousseau existant dans lequel ajouter des elements.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $requestedFullName = trim((string) $input->getOption('user'));
        $vaultCount = $this->parsePositiveInt((string) $input->getOption('vaults'));
        $itemsPerVault = $this->parsePositiveInt((string) $input->getOption('items'));
        $targetVaultName = trim((string) $input->getOption('target-vault'));

        if ($requestedFullName === '') {
            $io->error('L option --user ne peut pas etre vide.');

            return Command::FAILURE;
        }

        if ($vaultCount === null || $itemsPerVault === null) {
            $io->error('Les options --vaults et --items doivent etre des entiers strictement positifs.');

            return Command::FAILURE;
        }

        $user = $this->findUserByFullName($requestedFullName);

        if (!$user instanceof User) {
            $io->error(sprintf('Utilisateur introuvable: %s.', $requestedFullName));

            return Command::FAILURE;
        }

        $nameToken = $this->buildNameToken($user);

        if ($targetVaultName !== '') {
            return $this->appendItemsToExistingVault($io, $user, $targetVaultName, $itemsPerVault, $nameToken);
        }

        for ($vaultIndex = 1; $vaultIndex <= $vaultCount; ++$vaultIndex) {
            $vault = (new Vault())
                ->setOwner($user)
                ->setName(sprintf('Trousseau %02d de %s', $vaultIndex, $nameToken))
                ->setDescription(sprintf('Trousseau de demonstration %02d pour %s.', $vaultIndex, $user->getDisplayName()));

            for ($itemIndex = 1; $itemIndex <= $itemsPerVault; ++$itemIndex) {
                $globalIndex = (($vaultIndex - 1) * $itemsPerVault) + $itemIndex;

                $item = (new VaultItem())
                    ->setName(sprintf('Element %02d.%02d', $vaultIndex, $itemIndex))
                    ->setUsername(sprintf('%s%03d@example.com', $nameToken, $globalIndex))
                    ->setSecret(sprintf('%s-%02d-%02d-%s', strtoupper($nameToken), $vaultIndex, $itemIndex, substr(hash('sha256', (string) $globalIndex), 0, 10)))
                    ->setNotes(sprintf('Element de test %02d du trousseau %02d pour %s.', $itemIndex, $vaultIndex, $user->getDisplayName()))
                    ->setIsSensitive($itemIndex % 3 === 0);

                $vault->addItem($item);
            }

            $this->entityManager->persist($vault);
        }

        $this->entityManager->flush();

        $io->success(sprintf(
            '%d trousseaux et %d elements ont ete crees pour %s.',
            $vaultCount,
            $vaultCount * $itemsPerVault,
            $user->getDisplayName()
        ));

        return Command::SUCCESS;
    }

    private function appendItemsToExistingVault(
        SymfonyStyle $io,
        User $user,
        string $targetVaultName,
        int $itemsToAdd,
        string $nameToken,
    ): int {
        $vault = $this->findOwnedVaultByName($user, $targetVaultName);

        if (!$vault instanceof Vault) {
            $io->error(sprintf('Trousseau introuvable pour %s: %s.', $user->getDisplayName(), $targetVaultName));

            return Command::FAILURE;
        }

        $existingItemCount = $vault->getItems()->count();

        for ($offset = 1; $offset <= $itemsToAdd; ++$offset) {
            $itemNumber = $existingItemCount + $offset;

            $item = (new VaultItem())
                ->setName(sprintf('Element %02d', $itemNumber))
                ->setUsername(sprintf('%s%03d@example.com', $nameToken, $itemNumber))
                ->setSecret(sprintf('%s-%s-%s', strtoupper($nameToken), $this->slugify($vault->getName()), substr(hash('sha256', (string) $itemNumber), 0, 10)))
                ->setNotes(sprintf('Element ajoute au trousseau %s pour %s.', $vault->getName(), $user->getDisplayName()))
                ->setIsSensitive($itemNumber % 3 === 0);

            $vault->addItem($item);
        }

        $this->entityManager->flush();

        $io->success(sprintf(
            '%d elements ont ete ajoutes au trousseau %s pour %s.',
            $itemsToAdd,
            $vault->getName(),
            $user->getDisplayName()
        ));

        return Command::SUCCESS;
    }

    private function findUserByFullName(string $requestedFullName): ?User
    {
        $normalizedRequestedFullName = $this->normalizeText($requestedFullName);

        foreach ($this->userRepository->findAllOrderedByCreationDateDesc() as $user) {
            $fullName = $this->normalizeText($user->getDisplayName());

            if ($fullName === $normalizedRequestedFullName) {
                return $user;
            }
        }

        return null;
    }

    private function parsePositiveInt(string $value): ?int
    {
        $intValue = filter_var($value, FILTER_VALIDATE_INT);

        if (!is_int($intValue) || $intValue <= 0) {
            return null;
        }

        return $intValue;
    }

    private function normalizeText(string $value): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/', ' ', $value) ?? ''));
    }

    private function buildNameToken(User $user): string
    {
        $source = $user->getFirstname() ?? $user->getDisplayName();
        $normalized = mb_strtolower(trim($source));
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalized);
        $token = preg_replace('/[^a-z0-9]+/', '.', $ascii !== false ? $ascii : $normalized) ?? '';
        $token = trim($token, '.');

        return $token !== '' ? $token : 'user';
    }

    private function findOwnedVaultByName(User $user, string $vaultName): ?Vault
    {
        foreach ($this->vaultRepository->findAccessibleVaultsForUser($user) as $vault) {
            if ($vault->getOwner()?->getId() === $user->getId() && $this->normalizeText($vault->getName()) === $this->normalizeText($vaultName)) {
                return $vault;
            }
        }

        return null;
    }

    private function slugify(string $value): string
    {
        $normalized = mb_strtolower(trim($value));
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalized);
        $slug = preg_replace('/[^a-z0-9]+/', '-', $ascii !== false ? $ascii : $normalized) ?? '';
        $slug = trim($slug, '-');

        return $slug !== '' ? $slug : 'vault';
    }
}
