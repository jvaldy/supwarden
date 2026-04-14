<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ItemUriRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ItemUriRepository::class)]
#[ORM\Table(name: 'sw_item_uri')]
#[ORM\Index(columns: ['item_id'], name: 'idx_item_uri_item_id')]
class ItemUri
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: VaultItem::class, inversedBy: 'uris')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?VaultItem $item = null;

    #[ORM\Column(length: 120, nullable: true)]
    #[Assert\Length(max: 120, maxMessage: "Le libelle de l'URI ne peut pas depasser 120 caracteres.")]
    private ?string $label = null;

    #[ORM\Column(length: 2048)]
    #[Assert\NotBlank(message: "L'URL est obligatoire.")]
    #[Assert\Url(message: "L'URL saisie est invalide.")]
    #[Assert\Length(max: 2048, maxMessage: "L'URL ne peut pas depasser 2048 caracteres.")]
    private string $uri = '';

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getItem(): ?VaultItem
    {
        return $this->item;
    }

    public function setItem(?VaultItem $item): self
    {
        $this->item = $item;

        return $this;
    }

    public function getLabel(): ?string
    {
        return $this->label;
    }

    public function setLabel(?string $label): self
    {
        $normalizedLabel = $label !== null ? trim($label) : null;
        $this->label = $normalizedLabel !== '' ? $normalizedLabel : null;

        return $this;
    }

    public function getUri(): string
    {
        return $this->uri;
    }

    public function setUri(string $uri): self
    {
        $this->uri = trim($uri);

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}

