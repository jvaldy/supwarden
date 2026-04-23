<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\CustomFieldRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: CustomFieldRepository::class)]
#[ORM\Table(name: 'sw_custom_field')]
#[ORM\Index(columns: ['item_id'], name: 'idx_custom_field_item_id')]
class CustomField
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: VaultItem::class, inversedBy: 'customFields')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?VaultItem $item = null;

    #[ORM\Column(length: 120)]
    #[Assert\NotBlank(message: 'Le libelle du champ personnalise est obligatoire.')]
    #[Assert\Length(max: 120, maxMessage: 'Le libelle du champ personnalise ne peut pas depasser 120 caracteres.')]
    private string $label = '';

    #[ORM\Column(length: 40)]
    private string $type = 'text';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $value = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $isSensitive = false;

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

    public function getLabel(): string
    {
        return $this->label;
    }

    public function setLabel(string $label): self
    {
        $this->label = trim($label);

        return $this;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function setType(string $type): self
    {
        $this->type = trim($type) !== '' ? trim($type) : 'text';

        return $this;
    }

    public function getValue(): ?string
    {
        return $this->value;
    }

    public function setValue(?string $value): self
    {
        $normalizedValue = $value !== null ? trim($value) : null;
        $this->value = $normalizedValue !== '' ? $normalizedValue : null;

        return $this;
    }

    public function isSensitive(): bool
    {
        return $this->isSensitive;
    }

    public function setIsSensitive(bool $isSensitive): self
    {
        $this->isSensitive = $isSensitive;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}

