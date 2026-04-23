<?php

namespace App\Entity;

use App\Repository\OAuthAccountRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: OAuthAccountRepository::class)]
#[ORM\Table(name: 'sw_oauth_account')]
#[ORM\UniqueConstraint(name: 'uniq_oauth_provider_subject', columns: ['provider', 'provider_user_id'])]
class OAuthAccount
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 40)]
    private string $provider = '';

    #[ORM\Column(length: 255, name: 'provider_user_id')]
    private string $providerUserId = '';

    #[ORM\Column(length: 180, nullable: true)]
    private ?string $providerEmail = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $providerAvatarUrl = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'oauthAccounts')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getProvider(): string
    {
        return $this->provider;
    }

    public function setProvider(string $provider): self
    {
        $this->provider = trim($provider);

        return $this;
    }

    public function getProviderUserId(): string
    {
        return $this->providerUserId;
    }

    public function setProviderUserId(string $providerUserId): self
    {
        $this->providerUserId = trim($providerUserId);

        return $this;
    }

    public function getProviderEmail(): ?string
    {
        return $this->providerEmail;
    }

    public function setProviderEmail(?string $providerEmail): self
    {
        $this->providerEmail = $providerEmail !== null ? mb_strtolower(trim($providerEmail)) : null;
        $this->touch();

        return $this;
    }

    public function getProviderAvatarUrl(): ?string
    {
        return $this->providerAvatarUrl;
    }

    public function setProviderAvatarUrl(?string $providerAvatarUrl): self
    {
        $trimmedValue = $providerAvatarUrl !== null ? trim($providerAvatarUrl) : null;
        $this->providerAvatarUrl = $trimmedValue !== '' ? $trimmedValue : null;
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

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): self
    {
        $this->user = $user;
        $this->touch();

        return $this;
    }

    private function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
