<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260402124500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Active la sensibilite par defaut sur les items existants et futurs.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE vault_item ALTER COLUMN is_sensitive SET DEFAULT TRUE');
        $this->addSql('UPDATE vault_item SET is_sensitive = TRUE WHERE is_sensitive = FALSE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('UPDATE vault_item SET is_sensitive = FALSE');
        $this->addSql('ALTER TABLE vault_item ALTER COLUMN is_sensitive SET DEFAULT FALSE');
    }
}
