<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ItemPermissionRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ItemPermissionRepository::class)]
#[ORM\Table(name: 'item_permission')]
#[ORM\UniqueConstraint(name: 'uniq_item_permission_item_user', columns: ['item_id', 'user_id'])]
#[ORM\Index(columns: ['item_id'], name: 'idx_item_permission_item_id')]
#[ORM\Index(columns: ['user_id'], name: 'idx_item_permission_user_id')]
class ItemPermission
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: VaultItem::class, inversedBy: 'itemPermissions')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?VaultItem $item = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(options: ['default' => true])]
    private bool $canView = true;

    #[ORM\Column(options: ['default' => false])]
    private bool $canEdit = false;

    #[ORM\Column(options: ['default' => false])]
    private bool $canManageAttachments = false;

    #[ORM\Column(options: ['default' => true])]
    private bool $canRevealSecret = true;

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

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): self
    {
        $this->user = $user;

        return $this;
    }

    public function canView(): bool
    {
        return $this->canView;
    }

    public function setCanView(bool $canView): self
    {
        $this->canView = $canView;

        return $this;
    }

    public function canEdit(): bool
    {
        return $this->canEdit;
    }

    public function setCanEdit(bool $canEdit): self
    {
        $this->canEdit = $canEdit;

        return $this;
    }

    public function canManageAttachments(): bool
    {
        return $this->canManageAttachments;
    }

    public function setCanManageAttachments(bool $canManageAttachments): self
    {
        $this->canManageAttachments = $canManageAttachments;

        return $this;
    }

    public function canRevealSecret(): bool
    {
        return $this->canRevealSecret;
    }

    public function setCanRevealSecret(bool $canRevealSecret): self
    {
        $this->canRevealSecret = $canRevealSecret;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
