<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260407143000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute le suivi des imports et exports utilisateur pour les statistiques avancées.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE app_user ADD export_count INT DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE app_user ADD last_export_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE app_user ADD import_count INT DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE app_user ADD last_import_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE app_user DROP export_count');
        $this->addSql('ALTER TABLE app_user DROP last_export_at');
        $this->addSql('ALTER TABLE app_user DROP import_count');
        $this->addSql('ALTER TABLE app_user DROP last_import_at');
    }
}
