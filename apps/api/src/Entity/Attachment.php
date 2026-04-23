<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\AttachmentRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AttachmentRepository::class)]
#[ORM\Table(name: 'sw_attachment')]
#[ORM\Index(columns: ['item_id'], name: 'idx_attachment_item_id')]
#[ORM\UniqueConstraint(name: 'uniq_attachment_stored_name', columns: ['stored_name'])]
class Attachment
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: VaultItem::class, inversedBy: 'attachments')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?VaultItem $item = null;

    #[ORM\Column(length: 255)]
    private string $originalName = '';

    #[ORM\Column(length: 255)]
    private string $storedName = '';

    #[ORM\Column(length: 120)]
    private string $mimeType = '';

    #[ORM\Column]
    private int $size = 0;

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

    public function getOriginalName(): string
    {
        return $this->originalName;
    }

    public function setOriginalName(string $originalName): self
    {
        $this->originalName = trim($originalName);

        return $this;
    }

    public function getStoredName(): string
    {
        return $this->storedName;
    }

    public function setStoredName(string $storedName): self
    {
        $this->storedName = trim($storedName);

        return $this;
    }

    public function getMimeType(): string
    {
        return $this->mimeType;
    }

    public function setMimeType(string $mimeType): self
    {
        $this->mimeType = trim($mimeType);

        return $this;
    }

    public function getSize(): int
    {
        return $this->size;
    }

    public function setSize(int $size): self
    {
        $this->size = $size;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
