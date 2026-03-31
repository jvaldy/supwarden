<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\VaultType;
use App\Repository\VaultRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: VaultRepository::class)]
#[ORM\Table(name: 'vault')]
#[ORM\Index(columns: ['owner_id'], name: 'idx_vault_owner_id')]
#[ORM\Index(columns: ['created_at'], name: 'idx_vault_created_at')]
#[ORM\HasLifecycleCallbacks]
class Vault
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 160)]
    #[Assert\NotBlank(message: 'Le nom du trousseau est obligatoire.')]
    #[Assert\Length(max: 160, maxMessage: 'Le nom du trousseau ne peut pas dépasser 160 caractères.')]
    private string $name = '';

    #[ORM\Column(type: 'text', nullable: true)]
    #[Assert\Length(max: 1000, maxMessage: 'La description du trousseau ne peut pas dépasser 1000 caractères.')]
    private ?string $description = null;

    #[ORM\Column(enumType: VaultType::class)]
    private VaultType $type = VaultType::PERSONAL;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'ownedVaults')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $owner = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    /**
     * @var Collection<int, VaultMember>
     */
    #[ORM\OneToMany(mappedBy: 'vault', targetEntity: VaultMember::class, orphanRemoval: true, cascade: ['persist'])]
    #[ORM\OrderBy(['createdAt' => 'ASC'])]
    private Collection $members;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = $this->createdAt;
        $this->members = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = trim($name);
        $this->touch();

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): self
    {
        $normalizedDescription = $description !== null ? trim($description) : null;
        $this->description = $normalizedDescription !== '' ? $normalizedDescription : null;
        $this->touch();

        return $this;
    }

    public function getType(): VaultType
    {
        return $this->type;
    }

    public function getOwner(): ?User
    {
        return $this->owner;
    }

    public function setOwner(?User $owner): self
    {
        $this->owner = $owner;
        $this->refreshTypeFromMembers();
        $this->touch();

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    /**
     * @return Collection<int, VaultMember>
     */
    public function getMembers(): Collection
    {
        return $this->members;
    }

    public function addMember(VaultMember $member): self
    {
        if (!$this->members->contains($member)) {
            $this->members->add($member);
            $member->setVault($this);
            $this->touch();
        }

        $this->refreshTypeFromMembers();

        return $this;
    }

    public function removeMember(VaultMember $member): self
    {
        if ($this->members->removeElement($member) && $member->getVault() === $this) {
            $member->setVault(null);
            $this->touch();
        }

        $this->refreshTypeFromMembers();

        return $this;
    }

    public function refreshTypeFromMembers(): self
    {
        $previousType = $this->type;
        $hasNonOwnerMember = false;

        foreach ($this->members as $member) {
            if (!$this->isOwnerMembership($member)) {
                $hasNonOwnerMember = true;
                break;
            }
        }

        $this->type = $hasNonOwnerMember ? VaultType::SHARED : VaultType::PERSONAL;

        if ($previousType !== $this->type) {
            $this->touch();
        }

        return $this;
    }

    #[ORM\PrePersist]
    #[ORM\PreUpdate]
    public function updateTimestamp(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    private function isOwnerMembership(VaultMember $member): bool
    {
        $memberUser = $member->getUser();

        if (!$memberUser instanceof User || !$this->owner instanceof User) {
            return false;
        }

        $ownerId = $this->owner->getId();
        $memberUserId = $memberUser->getId();

        if ($ownerId !== null && $memberUserId !== null) {
            return $ownerId === $memberUserId;
        }

        return $memberUser === $this->owner;
    }

    private function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
