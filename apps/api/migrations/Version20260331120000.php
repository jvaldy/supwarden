<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260331120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute updated_at aux trousseaux existants.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE vault ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('UPDATE vault SET updated_at = created_at WHERE updated_at IS NULL');
        $this->addSql('ALTER TABLE vault ALTER COLUMN updated_at SET NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE vault DROP updated_at');
    }
}
