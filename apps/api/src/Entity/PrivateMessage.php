<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\PrivateMessageRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: PrivateMessageRepository::class)]
#[ORM\Table(name: 'sw_private_message')]
#[ORM\Index(columns: ['sender_id', 'recipient_id', 'created_at'], name: 'idx_private_message_pair_created_at')]
#[ORM\Index(columns: ['created_at'], name: 'idx_private_message_created_at')]
#[ORM\Index(columns: ['recipient_id', 'read_at'], name: 'idx_private_message_recipient_read_at')]
class PrivateMessage
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $sender = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $recipient = null;

    #[ORM\Column(type: 'text')]
    #[Assert\NotBlank(message: 'Le message ne peut pas etre vide.')]
    #[Assert\Length(max: 4000, maxMessage: 'Le message ne peut pas depasser 4000 caracteres.')]
    private string $content = '';

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $readAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSender(): ?User
    {
        return $this->sender;
    }

    public function setSender(?User $sender): self
    {
        $this->sender = $sender;

        return $this;
    }

    public function getRecipient(): ?User
    {
        return $this->recipient;
    }

    public function setRecipient(?User $recipient): self
    {
        $this->recipient = $recipient;

        return $this;
    }

    public function getContent(): string
    {
        return $this->content;
    }

    public function setContent(string $content): self
    {
        $this->content = trim($content);

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getReadAt(): ?\DateTimeImmutable
    {
        return $this->readAt;
    }

    public function setReadAt(?\DateTimeImmutable $readAt): self
    {
        $this->readAt = $readAt;

        return $this;
    }

    public function isRead(): bool
    {
        return $this->readAt instanceof \DateTimeImmutable;
    }

    public function markAsRead(?\DateTimeImmutable $readAt = null): self
    {
        $this->readAt = $readAt ?? new \DateTimeImmutable();

        return $this;
    }
}
