<?php

namespace App\Dto\User;

use Symfony\Component\Validator\Constraints as Assert;

class DeleteAccountInput
{
    #[Assert\NotBlank(message: 'Le mot de passe actuel est obligatoire pour supprimer le compte.')]
    public string $currentPassword = '';

    #[Assert\IsTrue(message: 'La confirmation de suppression est obligatoire.')]
    public bool $confirmDeletion = false;
}
