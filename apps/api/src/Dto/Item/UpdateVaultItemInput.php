<?php

declare(strict_types=1);

namespace App\Dto\Item;

use Symfony\Component\Validator\Constraints as Assert;

final class UpdateVaultItemInput
{
    #[Assert\NotBlank(message: 'Le nom de l\'element est obligatoire.')]
    #[Assert\Length(max: 160, maxMessage: 'Le nom de l\'element ne peut pas depasser 160 caracteres.')]
    public ?string $name = null;

    public ?string $username = null;
    public ?string $secret = null;
    public ?string $notes = null;
    public bool $isSensitive = true;

    /**
     * @var list<array<string, mixed>>
     */
    public array $uris = [];

    /**
     * @var list<array<string, mixed>>
     */
    public array $customFields = [];
}
