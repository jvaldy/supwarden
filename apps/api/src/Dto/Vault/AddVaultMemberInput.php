<?php

declare(strict_types=1);

namespace App\Dto\Vault;

use Symfony\Component\Validator\Constraints as Assert;

class AddVaultMemberInput
{
    #[Assert\NotBlank(message: 'L\'adresse e-mail du membre est obligatoire.')]
    #[Assert\Email(message: 'Le format de l\'adresse e-mail est invalide.')]
    public string $email = '';

    #[Assert\NotBlank(message: 'Le rôle du membre est obligatoire.')]
    #[Assert\Choice(choices: ['EDITOR', 'VIEWER'], message: 'Le rôle du membre est invalide.')]
    public string $role = '';
}
