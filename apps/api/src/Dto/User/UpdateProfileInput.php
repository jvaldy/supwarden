<?php

namespace App\Dto\User;

use Symfony\Component\Validator\Constraints as Assert;

class UpdateProfileInput
{
    #[Assert\Length(max: 120)]
    public ?string $firstname = null;

    #[Assert\Length(max: 120)]
    public ?string $lastname = null;

    #[Assert\Email(message: 'Le format de l\'adresse e-mail est invalide.')]
    #[Assert\Length(max: 180)]
    public ?string $email = null;

    #[Assert\Length(max: 255)]
    public ?string $currentPassword = null;

    #[Assert\Length(
        min: 10,
        max: 255,
        minMessage: 'Le nouveau mot de passe doit contenir au moins {{ limit }} caractères.',
        maxMessage: 'Le nouveau mot de passe ne peut pas dépasser {{ limit }} caractères.'
    )]
    public ?string $newPassword = null;

    #[Assert\Length(max: 12)]
    #[Assert\Regex(
        pattern: '/^\d{4,6}$/',
        message: 'Le code PIN doit contenir entre 4 et 6 chiffres.'
    )]
    public ?string $currentPin = null;

    #[Assert\Length(max: 12)]
    #[Assert\Regex(
        pattern: '/^\d{4,6}$/',
        message: 'Le code PIN doit contenir entre 4 et 6 chiffres.'
    )]
    public ?string $newPin = null;
}