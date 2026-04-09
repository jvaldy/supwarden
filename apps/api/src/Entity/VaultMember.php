<?php

namespace App\Entity;

use App\Enum\VaultMemberRole;
use App\Repository\VaultMemberRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: VaultMemberRepository::class)]
#[ORM\Table(
    name: 'vault_member',
    uniqueConstraints: [new ORM\UniqueConstraint(name: 'uniq_vault_member_vault_user', columns: ['vault_id', 'user_id'])],
    indexes: [
        new ORM\Index(name: 'idx_vault_member_vault_id', columns: ['vault_id']),
        new ORM\Index(name: 'idx_vault_member_user_id', columns: ['user_id']),
        new ORM\Index(name: 'idx_vault_member_last_chat_read_at', columns: ['last_chat_read_at']),
    ]
)]
class VaultMember
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Vault::class, inversedBy: 'members')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Vault $vault = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'vaultMemberships')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(enumType: VaultMemberRole::class)]
    private VaultMemberRole $role = VaultMemberRole::VIEWER;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $lastChatReadAt = null;

    public function __construct()
    {
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->lastChatReadAt = $now;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getVault(): ?Vault
    {
        return $this->vault;
    }

    public function setVault(?Vault $vault): self
    {
        $this->vault = $vault;

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

    public function getRole(): VaultMemberRole
    {
        return $this->role;
    }

    public function setRole(VaultMemberRole $role): self
    {
        $this->role = $role;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getLastChatReadAt(): ?\DateTimeImmutable
    {
        return $this->lastChatReadAt;
    }

    public function setLastChatReadAt(?\DateTimeImmutable $lastChatReadAt): self
    {
        $this->lastChatReadAt = $lastChatReadAt;

        return $this;
    }

    public function markChatAsRead(?\DateTimeImmutable $readAt = null): self
    {
        $this->lastChatReadAt = $readAt ?? new \DateTimeImmutable();

        return $this;
    }
}
