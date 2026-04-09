<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260409090000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute le suivi de lecture des messages de trousseau par membre.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE vault_member ADD last_chat_read_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql("COMMENT ON COLUMN vault_member.last_chat_read_at IS '(DC2Type:datetime_immutable)'");
        $this->addSql('UPDATE vault_member SET last_chat_read_at = created_at WHERE last_chat_read_at IS NULL');
        $this->addSql('CREATE INDEX idx_vault_member_last_chat_read_at ON vault_member (last_chat_read_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_vault_member_last_chat_read_at');
        $this->addSql('ALTER TABLE vault_member DROP last_chat_read_at');
    }
}
