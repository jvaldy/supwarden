<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'sw_app_user')]
#[UniqueEntity(fields: ['email'], message: 'Cette adresse e-mail est d?j? utilis?e.')]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['user:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 180, unique: true)]
    #[Assert\NotBlank(message: 'L\'adresse e-mail est obligatoire.')]
    #[Assert\Email(message: 'Le format de l\'adresse e-mail est invalide.')]
    #[Groups(['user:read'])]
    private string $email = '';

    /**
     * @var list<string>
     */
    #[ORM\Column]
    #[Groups(['user:read'])]
    private array $roles = [];

    #[ORM\Column]
    #[Ignore]
    private string $password = '';

    #[ORM\Column]
    #[Groups(['user:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(length: 120, nullable: true)]
    #[Assert\Length(max: 120)]
    #[Groups(['user:read'])]
    private ?string $firstname = null;

    #[ORM\Column(length: 120, nullable: true)]
    #[Assert\Length(max: 120)]
    #[Groups(['user:read'])]
    private ?string $lastname = null;

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['user:read'])]
    private bool $isActive = true;

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['user:read'])]
    private bool $hasLocalPassword = true;

    #[ORM\Column(length: 255, nullable: true)]
    #[Ignore]
    private ?string $pinHash = null;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['user:read'])]
    private bool $hasPin = false;

    #[ORM\Column(options: ['default' => 1])]
    private int $authTokenVersion = 1;

    /**
     * @var Collection<int, OAuthAccount>
     */
    #[ORM\OneToMany(mappedBy: 'user', targetEntity: OAuthAccount::class, orphanRemoval: true)]
    private Collection $oauthAccounts;

    /**
     * @var Collection<int, Vault>
     */
    #[ORM\OneToMany(mappedBy: 'owner', targetEntity: Vault::class, orphanRemoval: true)]
    private Collection $ownedVaults;

    /**
     * @var Collection<int, VaultMember>
     */
    #[ORM\OneToMany(mappedBy: 'user', targetEntity: VaultMember::class, orphanRemoval: true)]
    private Collection $vaultMemberships;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->roles = ['ROLE_USER'];
        $this->oauthAccounts = new ArrayCollection();
        $this->ownedVaults = new ArrayCollection();
        $this->vaultMemberships = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function setEmail(string $email): self
    {
        $this->email = mb_strtolower(trim($email));

        return $this;
    }

    public function getUserIdentifier(): string
    {
        return $this->email;
    }

    /**
     * @return list<string>
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = 'ROLE_USER';

        return array_values(array_unique($roles));
    }

    /**
     * @param list<string> $roles
     */
    public function setRoles(array $roles): self
    {
        $this->roles = array_values(array_unique($roles));

        return $this;
    }

    public function getPassword(): string
    {
        return $this->password;
    }

    public function setPassword(string $password): self
    {
        $this->password = $password;

        return $this;
    }

    public function eraseCredentials(): void
    {
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): self
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getFirstname(): ?string
    {
        return $this->firstname;
    }

    public function setFirstname(?string $firstname): self
    {
        $this->firstname = $this->normalizeName($firstname);

        return $this;
    }

    public function getLastname(): ?string
    {
        return $this->lastname;
    }

    public function setLastname(?string $lastname): self
    {
        $this->lastname = $this->normalizeName($lastname);

        return $this;
    }

    public function isActive(): bool
    {
        return $this->isActive;
    }

    public function setIsActive(bool $isActive): self
    {
        $this->isActive = $isActive;

        return $this;
    }

    public function hasLocalPassword(): bool
    {
        return $this->hasLocalPassword;
    }

    public function setHasLocalPassword(bool $hasLocalPassword): self
    {
        $this->hasLocalPassword = $hasLocalPassword;

        return $this;
    }

    public function getPinHash(): ?string
    {
        return $this->pinHash;
    }

    public function setPinHash(?string $pinHash): self
    {
        $this->pinHash = $pinHash;

        return $this;
    }

    public function hasPin(): bool
    {
        return $this->hasPin;
    }

    public function setHasPin(bool $hasPin): self
    {
        $this->hasPin = $hasPin;

        return $this;
    }

    public function getAuthTokenVersion(): int
    {
        return $this->authTokenVersion;
    }

    public function setAuthTokenVersion(int $authTokenVersion): self
    {
        $this->authTokenVersion = $authTokenVersion;

        return $this;
    }

    public function incrementAuthTokenVersion(): self
    {
        ++$this->authTokenVersion;

        return $this;
    }

    public function getDisplayName(): string
    {
        $nameParts = array_filter([$this->firstname, $this->lastname]);

        return $nameParts !== [] ? implode(' ', $nameParts) : $this->email;
    }

    /**
     * @return Collection<int, OAuthAccount>
     */
    public function getOauthAccounts(): Collection
    {
        return $this->oauthAccounts;
    }

    public function addOauthAccount(OAuthAccount $oauthAccount): self
    {
        if (!$this->oauthAccounts->contains($oauthAccount)) {
            $this->oauthAccounts->add($oauthAccount);
            $oauthAccount->setUser($this);
        }

        return $this;
    }

    public function removeOauthAccount(OAuthAccount $oauthAccount): self
    {
        if ($this->oauthAccounts->removeElement($oauthAccount) && $oauthAccount->getUser() === $this) {
            $oauthAccount->setUser(null);
        }

        return $this;
    }

    /**
     * @return Collection<int, Vault>
     */
    public function getOwnedVaults(): Collection
    {
        return $this->ownedVaults;
    }

    /**
     * @return Collection<int, VaultMember>
     */
    public function getVaultMemberships(): Collection
    {
        return $this->vaultMemberships;
    }

    private function normalizeName(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmedValue = trim($value);

        return $trimmedValue !== '' ? $trimmedValue : null;
    }
}

