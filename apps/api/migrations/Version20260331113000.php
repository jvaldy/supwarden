<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260331113000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute la description des trousseaux.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE vault ADD description TEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE vault DROP description');
    }
}