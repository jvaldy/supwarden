<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260408183000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute le suivi de lecture pour les messages prives.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE private_message ADD read_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql("COMMENT ON COLUMN private_message.read_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql('CREATE INDEX idx_private_message_recipient_read_at ON private_message (recipient_id, read_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_private_message_recipient_read_at');
        $this->addSql('ALTER TABLE private_message DROP read_at');
    }
}
