<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;
use Doctrine\DBAL\Platforms\SqlitePlatform;

final class Version20260330100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute un indicateur de mot de passe local défini pour distinguer les comptes OAuth.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE app_user ADD has_local_password BOOLEAN DEFAULT TRUE NOT NULL');

        if ($this->connection->getDatabasePlatform() instanceof SqlitePlatform) {
            $this->addSql('UPDATE app_user SET has_local_password = 0 WHERE id IN (SELECT user_id FROM oauth_account)');
            return;
        }

        $this->addSql('UPDATE app_user SET has_local_password = FALSE WHERE id IN (SELECT user_id FROM oauth_account)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE app_user DROP has_local_password');
    }
}