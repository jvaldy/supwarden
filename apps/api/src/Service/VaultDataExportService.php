<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Attachment;
use App\Entity\CustomField;
use App\Entity\ItemUri;
use App\Entity\User;
use App\Entity\Vault;
use App\Entity\VaultItem;
use App\Repository\VaultRepository;

final class VaultDataExportService
{
    public function __construct(
        private readonly VaultRepository $vaultRepository,
        private readonly VaultSecretCipher $vaultSecretCipher,
    ) {
    }

    /**
     * @return array{vaults:list<array<string,mixed>>}
     */
    public function buildJsonExport(User $user): array
    {
        $vaults = $this->vaultRepository->findOwnedVaultsForUser($user);

        return [
            'vaults' => array_map(fn (Vault $vault): array => $this->buildVaultPayload($vault), $vaults),
        ];
    }

    /**
     * @return array{vaults:list<array<string,mixed>>}
     */
    public function buildSingleVaultJsonExport(Vault $vault): array
    {
        return [
            'vaults' => [$this->buildVaultPayload($vault)],
        ];
    }

    public function buildCsvExport(User $user): string
    {
        $vaults = $this->vaultRepository->findOwnedVaultsForUser($user);

        return $this->buildCsvContent($vaults);
    }

    public function buildSingleVaultCsvExport(Vault $vault): string
    {
        return $this->buildCsvContent([$vault]);
    }

    /**
     * @param list<Vault> $vaults
     */
    private function buildCsvContent(array $vaults): string
    {
        $handle = fopen('php://temp', 'wb+');

        if ($handle === false) {
            throw new \RuntimeException('Impossible de préparer l’export CSV.');
        }

        fputcsv($handle, [
            'vault_name',
            'vault_description',
            'item_name',
            'item_type',
            'username',
            'secret',
            'is_sensitive',
            'notes',
            'uris_json',
            'custom_fields_json',
            'attachments_count',
            'updated_at',
        ]);

        foreach ($vaults as $vault) {
            foreach ($vault->getItems() as $item) {
                fputcsv($handle, [
                    $vault->getName(),
                    $vault->getDescription() ?? '',
                    $item->getName(),
                    $item->getType()->value,
                    $item->getUsername() ?? '',
                    $this->vaultSecretCipher->decrypt($item->getSecret()) ?? '',
                    $item->isSensitive() ? '1' : '0',
                    $item->getNotes() ?? '',
                    json_encode(array_map(static fn (ItemUri $uri): array => [
                        'label' => $uri->getLabel(),
                        'uri' => $uri->getUri(),
                    ], $item->getUris()->toArray()), JSON_UNESCAPED_UNICODE),
                    json_encode(array_map(static fn (CustomField $field): array => [
                        'label' => $field->getLabel(),
                        'type' => $field->getType(),
                        'value' => $field->getValue(),
                        'isSensitive' => $field->isSensitive(),
                    ], $item->getCustomFields()->toArray()), JSON_UNESCAPED_UNICODE),
                    (string) count($item->getAttachments()),
                    $item->getUpdatedAt()->format(\DateTimeInterface::ATOM),
                ]);
            }
        }

        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);

        return $content !== false ? $content : '';
    }

    /**
     * @return array<string,mixed>
     */
    private function buildVaultPayload(Vault $vault): array
    {
        return [
            'name' => $vault->getName(),
            'description' => $vault->getDescription(),
            'type' => $vault->getType()->value,
            'items' => array_map(fn (VaultItem $item): array => [
                'name' => $item->getName(),
                'type' => $item->getType()->value,
                'username' => $item->getUsername(),
                'secret' => $this->vaultSecretCipher->decrypt($item->getSecret()),
                'isSensitive' => $item->isSensitive(),
                'notes' => $item->getNotes(),
                'uris' => array_map(static fn (ItemUri $uri): array => [
                    'label' => $uri->getLabel(),
                    'uri' => $uri->getUri(),
                ], $item->getUris()->toArray()),
                'customFields' => array_map(static fn (CustomField $field): array => [
                    'label' => $field->getLabel(),
                    'type' => $field->getType(),
                    'value' => $field->getValue(),
                    'isSensitive' => $field->isSensitive(),
                ], $item->getCustomFields()->toArray()),
                'attachments' => array_map(static fn (Attachment $attachment): array => [
                    'name' => $attachment->getOriginalName(),
                    'mimeType' => $attachment->getMimeType(),
                    'size' => $attachment->getSize(),
                ], $item->getAttachments()->toArray()),
            ], $vault->getItems()->toArray()),
        ];
    }
}

