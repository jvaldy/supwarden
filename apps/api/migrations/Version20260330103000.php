<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260330103000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute le hash de PIN utilisateur et un indicateur de présence du PIN.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE app_user ADD pin_hash VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE app_user ADD has_pin BOOLEAN DEFAULT FALSE NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE app_user DROP pin_hash');
        $this->addSql('ALTER TABLE app_user DROP has_pin');
    }
}