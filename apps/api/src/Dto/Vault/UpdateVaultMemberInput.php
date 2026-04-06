<?php

declare(strict_types=1);

namespace App\Dto\Vault;

use Symfony\Component\Validator\Constraints as Assert;

class UpdateVaultMemberInput
{
    #[Assert\NotBlank(message: 'Le rôle du membre est obligatoire.')]
    #[Assert\Choice(choices: ['EDITOR', 'VIEWER'], message: 'Le rôle du membre est invalide.')]
    public string $role = '';
}
