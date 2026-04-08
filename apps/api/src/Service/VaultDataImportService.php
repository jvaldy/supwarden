<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Entity\Vault;
use App\Entity\VaultItem;
use App\Entity\VaultMember;
use App\Enum\ItemType;
use App\Enum\VaultMemberRole;
use App\Repository\VaultRepository;
use Doctrine\ORM\EntityManagerInterface;

final class VaultDataImportService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly VaultRepository $vaultRepository,
        private readonly VaultSecretCipher $vaultSecretCipher,
    ) {
    }

    /**
     * @return array{createdVaults:int,createdItems:int,errors:list<string>}
     */
    public function importFromJson(User $user, string $jsonContent): array
    {
        try {
            $decoded = json_decode($jsonContent, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return [
                'createdVaults' => 0,
                'createdItems' => 0,
                'errors' => ['Le fichier JSON est invalide.'],
            ];
        }

        $vaults = is_array($decoded['vaults'] ?? null) ? $decoded['vaults'] : [];

        return $this->importNormalizedVaults($user, $vaults);
    }

    /**
     * @return array{createdVaults:int,createdItems:int,errors:list<string>}
     */
    public function importFromCsv(User $user, string $csvContent): array
    {
        $rows = array_values(array_filter(preg_split('/\r\n|\n|\r/', $csvContent) ?: [], static fn (string $line): bool => trim($line) !== ''));

        if ($rows === []) {
            return [
                'createdVaults' => 0,
                'createdItems' => 0,
                'errors' => ['Le fichier CSV est vide.'],
            ];
        }

        $header = str_getcsv(array_shift($rows));
        $vaultMap = [];

        foreach ($rows as $lineNumber => $row) {
            $values = str_getcsv($row);
            $data = [];

            foreach ($header as $index => $column) {
                $data[$column] = $values[$index] ?? '';
            }

            $vaultName = trim((string) ($data['vault_name'] ?? ''));
            $itemName = trim((string) ($data['item_name'] ?? ''));

            if ($vaultName === '' || $itemName === '') {
                continue;
            }

            if (!isset($vaultMap[$vaultName])) {
                $vaultMap[$vaultName] = [
                    'name' => $vaultName,
                    'description' => trim((string) ($data['vault_description'] ?? '')),
                    'items' => [],
                ];
            }

            $vaultMap[$vaultName]['items'][] = [
                'name' => $itemName,
                'type' => (string) ($data['item_type'] ?? 'LOGIN'),
                'username' => trim((string) ($data['username'] ?? '')),
                'secret' => (string) ($data['secret'] ?? ''),
                'isSensitive' => in_array(strtolower((string) ($data['is_sensitive'] ?? '')), ['1', 'true', 'oui', 'yes'], true),
                'notes' => trim((string) ($data['notes'] ?? '')),
                'uris' => $this->decodeJsonArrayField((string) ($data['uris_json'] ?? ''), sprintf('Ligne %d: uris_json invalide.', $lineNumber + 2)),
                'customFields' => $this->decodeJsonArrayField((string) ($data['custom_fields_json'] ?? ''), sprintf('Ligne %d: custom_fields_json invalide.', $lineNumber + 2)),
            ];
        }

        return $this->importNormalizedVaults($user, array_values($vaultMap));
    }

    /**
     * @param list<array<string,mixed>> $vaults
     * @return array{createdVaults:int,createdItems:int,errors:list<string>}
     */
    private function importNormalizedVaults(User $user, array $vaults): array
    {
        $createdVaults = 0;
        $createdItems = 0;
        $errors = [];

        foreach ($vaults as $vaultIndex => $vaultData) {
            $vaultName = trim((string) ($vaultData['name'] ?? ''));

            if ($vaultName === '') {
                $errors[] = sprintf('Vault #%d ignoré: nom manquant.', $vaultIndex + 1);
                continue;
            }

            $vault = $this->vaultRepository->findOwnedVaultByName($user, $vaultName);

            if (!$vault instanceof Vault) {
                $vault = (new Vault())
                    ->setOwner($user)
                    ->setName($vaultName)
                    ->setDescription(is_string($vaultData['description'] ?? null) ? $vaultData['description'] : null);

                $vault->addMember(
                    (new VaultMember())
                        ->setUser($user)
                        ->setRole(VaultMemberRole::OWNER)
                );

                $this->entityManager->persist($vault);
                ++$createdVaults;
            }

            $existingSignatures = [];
            foreach ($vault->getItems() as $existingItem) {
                $existingSignatures[$this->buildItemSignature($existingItem->getName(), $existingItem->getUsername())] = true;
            }

            $items = is_array($vaultData['items'] ?? null) ? $vaultData['items'] : [];

            foreach ($items as $itemIndex => $itemData) {
                $itemName = trim((string) ($itemData['name'] ?? ''));

                if ($itemName === '') {
                    $errors[] = sprintf('%s > item #%d ignoré: nom manquant.', $vaultName, $itemIndex + 1);
                    continue;
                }

                $username = trim((string) ($itemData['username'] ?? ''));
                $signature = $this->buildItemSignature($itemName, $username !== '' ? $username : null);

                if (isset($existingSignatures[$signature])) {
                    $errors[] = sprintf('%s > %s ignoré: doublon détecté.', $vaultName, $itemName);
                    continue;
                }

                $existingSignatures[$signature] = true;

                $item = (new VaultItem())
                    ->setVault($vault)
                    ->setName($itemName)
                    ->setType(ItemType::LOGIN)
                    ->setUsername($username !== '' ? $username : null)
                    ->setSecret($this->vaultSecretCipher->encrypt((string) ($itemData['secret'] ?? '')))
                    ->setIsSensitive((bool) ($itemData['isSensitive'] ?? false))
                    ->setNotes(trim((string) ($itemData['notes'] ?? '')) ?: null);

                $uris = is_array($itemData['uris'] ?? null) ? $itemData['uris'] : [];
                foreach ($uris as $uriData) {
                    $uriValue = trim((string) ($uriData['uri'] ?? ''));
                    if ($uriValue === '') {
                        continue;
                    }

                    if (!preg_match('#^[a-z][a-z0-9+.-]*://#i', $uriValue)) {
                        $uriValue = sprintf('https://%s', ltrim($uriValue, '/'));
                    }

                    if (filter_var($uriValue, FILTER_VALIDATE_URL) === false) {
                        $errors[] = sprintf('%s > %s: URL invalide ignorée (%s).', $vaultName, $itemName, $uriValue);
                        continue;
                    }

                    $item->addUri(
                        (new \App\Entity\ItemUri())
                            ->setLabel(is_string($uriData['label'] ?? null) ? $uriData['label'] : null)
                            ->setUri($uriValue)
                    );
                }

                $customFields = is_array($itemData['customFields'] ?? null) ? $itemData['customFields'] : [];
                foreach ($customFields as $customFieldData) {
                    $label = trim((string) ($customFieldData['label'] ?? ''));
                    if ($label === '') {
                        continue;
                    }

                    $item->addCustomField(
                        (new \App\Entity\CustomField())
                            ->setLabel($label)
                            ->setType((string) ($customFieldData['type'] ?? 'text'))
                            ->setValue(is_string($customFieldData['value'] ?? null) ? $customFieldData['value'] : null)
                            ->setIsSensitive((bool) ($customFieldData['isSensitive'] ?? false))
                    );
                }

                $this->entityManager->persist($item);
                ++$createdItems;
            }
        }

        $this->entityManager->flush();

        return [
            'createdVaults' => $createdVaults,
            'createdItems' => $createdItems,
            'errors' => $errors,
        ];
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function decodeJsonArrayField(string $value, string $errorMessage): array
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return [];
        }

        try {
            $decoded = json_decode($trimmed, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return [];
        }

        return is_array($decoded) ? $decoded : [];
    }

    private function buildItemSignature(string $name, ?string $username): string
    {
        return sprintf('%s::%s', mb_strtolower(trim($name)), mb_strtolower(trim((string) $username)));
    }
}
