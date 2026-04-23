<?php

declare(strict_types=1);

namespace App\Dto\Vault;

use Symfony\Component\Validator\Constraints as Assert;

class CreateVaultInput
{
    #[Assert\NotBlank(message: 'Le nom du trousseau est obligatoire.')]
    #[Assert\Length(max: 160, maxMessage: 'Le nom du trousseau ne peut pas dépasser 160 caractères.')]
    public string $name = '';

    #[Assert\Length(max: 1000, maxMessage: 'La description du trousseau ne peut pas dépasser 1000 caractères.')]
    public ?string $description = null;
}
