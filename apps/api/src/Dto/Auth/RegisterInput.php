<?php

namespace App\Dto\Auth;

use Symfony\Component\Validator\Constraints as Assert;

class RegisterInput
{
    #[Assert\NotBlank(message: 'L\'adresse e-mail est obligatoire.')]
    #[Assert\Email(message: 'Le format de l\'adresse e-mail est invalide.')]
    public string $email = '';

    #[Assert\NotBlank(message: 'Le mot de passe est obligatoire.')]
    #[Assert\Length(
        min: 10,
        max: 255,
        minMessage: 'Le mot de passe doit contenir au moins {{ limit }} caract?res.',
        maxMessage: 'Le mot de passe ne peut pas d?passer {{ limit }} caract?res.'
    )]
    public string $password = '';

    #[Assert\Length(max: 120)]
    public ?string $firstname = null;

    #[Assert\Length(max: 120)]
    public ?string $lastname = null;
}
