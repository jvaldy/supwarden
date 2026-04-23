<?php

namespace App\Dto\Auth;

use Symfony\Component\Validator\Constraints as Assert;

class LoginInput
{
    #[Assert\NotBlank(message: 'L\'adresse e-mail est obligatoire.')]
    #[Assert\Email(message: 'Le format de l\'adresse e-mail est invalide.')]
    public string $email = '';

    #[Assert\NotBlank(message: 'Le mot de passe est obligatoire.')]
    public string $password = '';
}
