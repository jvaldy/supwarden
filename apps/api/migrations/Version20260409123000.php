<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260409123000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute le marqueur de trousseau personnel système.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE vault ADD is_personal_default BOOLEAN DEFAULT FALSE NOT NULL');
        $this->addSql("UPDATE vault SET is_personal_default = TRUE WHERE name = 'Trousseau personnel' AND type = 'PERSONAL'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE vault DROP is_personal_default');
    }
}
