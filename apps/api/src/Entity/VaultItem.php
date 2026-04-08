<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\ItemType;
use App\Repository\VaultItemRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: VaultItemRepository::class)]
#[ORM\Table(name: 'vault_item')]
#[ORM\Index(columns: ['vault_id'], name: 'idx_vault_item_vault_id')]
#[ORM\Index(columns: ['created_at'], name: 'idx_vault_item_created_at')]
#[ORM\HasLifecycleCallbacks]
class VaultItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Vault::class, inversedBy: 'items')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Vault $vault = null;

    #[ORM\Column(length: 160)]
    #[Assert\NotBlank(message: "Le nom de l'element est obligatoire.")]
    #[Assert\Length(max: 160, maxMessage: "Le nom de l'element ne peut pas depasser 160 caracteres.")]
    private string $name = '';

    #[ORM\Column(enumType: ItemType::class)]
    private ItemType $type = ItemType::LOGIN;

    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\Length(max: 255, maxMessage: "Le nom d'utilisateur ne peut pas depasser 255 caracteres.")]
    private ?string $username = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $secret = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $isSensitive = false;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Assert\Length(max: 5000, maxMessage: 'Les notes ne peuvent pas depasser 5000 caracteres.')]
    private ?string $notes = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    /**
     * @var Collection<int, ItemUri>
     */
    #[ORM\OneToMany(mappedBy: 'item', targetEntity: ItemUri::class, orphanRemoval: true, cascade: ['persist'])]
    #[ORM\OrderBy(['createdAt' => 'ASC'])]
    private Collection $uris;

    /**
     * @var Collection<int, CustomField>
     */
    #[ORM\OneToMany(mappedBy: 'item', targetEntity: CustomField::class, orphanRemoval: true, cascade: ['persist'])]
    #[ORM\OrderBy(['createdAt' => 'ASC'])]
    private Collection $customFields;

    /**
     * @var Collection<int, Attachment>
     */
    #[ORM\OneToMany(mappedBy: 'item', targetEntity: Attachment::class, orphanRemoval: true, cascade: ['persist'])]
    #[ORM\OrderBy(['createdAt' => 'DESC'])]
    private Collection $attachments;

    /**
     * @var Collection<int, ItemPermission>
     */
    #[ORM\OneToMany(mappedBy: 'item', targetEntity: ItemPermission::class, orphanRemoval: true, cascade: ['persist'])]
    private Collection $itemPermissions;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = $this->createdAt;
        $this->uris = new ArrayCollection();
        $this->customFields = new ArrayCollection();
        $this->attachments = new ArrayCollection();
        $this->itemPermissions = new ArrayCollection();
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
        $this->touch();

        return $this;
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

    public function getType(): ItemType
    {
        return $this->type;
    }

    public function setType(ItemType $type): self
    {
        $this->type = $type;
        $this->touch();

        return $this;
    }

    public function getUsername(): ?string
    {
        return $this->username;
    }

    public function setUsername(?string $username): self
    {
        $normalizedUsername = $username !== null ? trim($username) : null;
        $this->username = $normalizedUsername !== '' ? $normalizedUsername : null;
        $this->touch();

        return $this;
    }

    public function getSecret(): ?string
    {
        return $this->secret;
    }

    public function setSecret(?string $secret): self
    {
        $normalizedSecret = $secret !== null ? trim($secret) : null;
        $this->secret = $normalizedSecret !== '' ? $normalizedSecret : null;
        $this->touch();

        return $this;
    }

    public function isSensitive(): bool
    {
        return $this->isSensitive;
    }

    public function setIsSensitive(bool $isSensitive): self
    {
        $this->isSensitive = $isSensitive;
        $this->touch();

        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): self
    {
        $normalizedNotes = $notes !== null ? trim($notes) : null;
        $this->notes = $normalizedNotes !== '' ? $normalizedNotes : null;
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
     * @return Collection<int, ItemUri>
     */
    public function getUris(): Collection
    {
        return $this->uris;
    }

    public function addUri(ItemUri $uri): self
    {
        if (!$this->uris->contains($uri)) {
            $this->uris->add($uri);
            $uri->setItem($this);
            $this->touch();
        }

        return $this;
    }

    public function removeUri(ItemUri $uri): self
    {
        if ($this->uris->removeElement($uri) && $uri->getItem() === $this) {
            $uri->setItem(null);
            $this->touch();
        }

        return $this;
    }

    /**
     * @return Collection<int, CustomField>
     */
    public function getCustomFields(): Collection
    {
        return $this->customFields;
    }

    public function addCustomField(CustomField $customField): self
    {
        if (!$this->customFields->contains($customField)) {
            $this->customFields->add($customField);
            $customField->setItem($this);
            $this->touch();
        }

        return $this;
    }

    public function removeCustomField(CustomField $customField): self
    {
        if ($this->customFields->removeElement($customField) && $customField->getItem() === $this) {
            $customField->setItem(null);
            $this->touch();
        }

        return $this;
    }

    /**
     * @return Collection<int, Attachment>
     */
    public function getAttachments(): Collection
    {
        return $this->attachments;
    }

    public function addAttachment(Attachment $attachment): self
    {
        if (!$this->attachments->contains($attachment)) {
            $this->attachments->add($attachment);
            $attachment->setItem($this);
            $this->touch();
        }

        return $this;
    }

    public function removeAttachment(Attachment $attachment): self
    {
        if ($this->attachments->removeElement($attachment) && $attachment->getItem() === $this) {
            $attachment->setItem(null);
            $this->touch();
        }

        return $this;
    }

    /**
     * @return Collection<int, ItemPermission>
     */
    public function getItemPermissions(): Collection
    {
        return $this->itemPermissions;
    }

    public function addItemPermission(ItemPermission $itemPermission): self
    {
        if (!$this->itemPermissions->contains($itemPermission)) {
            $this->itemPermissions->add($itemPermission);
            $itemPermission->setItem($this);
            $this->touch();
        }

        return $this;
    }

    public function removeItemPermission(ItemPermission $itemPermission): self
    {
        if ($this->itemPermissions->removeElement($itemPermission) && $itemPermission->getItem() === $this) {
            $itemPermission->setItem(null);
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

    private function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}

