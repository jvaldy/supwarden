<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260326231000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Renames the app_user email unique index to match Doctrine naming.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER INDEX uniq_app_user_email RENAME TO UNIQ_88BDF3E9E7927C74');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER INDEX UNIQ_88BDF3E9E7927C74 RENAME TO uniq_app_user_email');
    }
}
