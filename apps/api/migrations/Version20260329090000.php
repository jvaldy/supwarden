<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\DBAL\Platforms\SqlitePlatform;
use Doctrine\Migrations\AbstractMigration;

final class Version20260329090000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Adds OAuth accounts linked to local users.';
    }

    public function up(Schema $schema): void
    {
        if ($this->connection->getDatabasePlatform() instanceof SqlitePlatform) {
            $this->addSql('CREATE TABLE oauth_account (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, user_id INTEGER NOT NULL, provider VARCHAR(40) NOT NULL, provider_user_id VARCHAR(255) NOT NULL, provider_email VARCHAR(180) DEFAULT NULL, provider_avatar_url VARCHAR(255) DEFAULT NULL, created_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
            , updated_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
            , CONSTRAINT FK_6D5A4D83A76ED395 FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE)');
        } else {
            $this->addSql('CREATE TABLE oauth_account (id SERIAL NOT NULL, user_id INT NOT NULL, provider VARCHAR(40) NOT NULL, provider_user_id VARCHAR(255) NOT NULL, provider_email VARCHAR(180) DEFAULT NULL, provider_avatar_url VARCHAR(255) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
            $this->addSql('ALTER TABLE oauth_account ADD CONSTRAINT FK_6D5A4D83A76ED395 FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        }

        $this->addSql('CREATE UNIQUE INDEX uniq_oauth_provider_subject ON oauth_account (provider, provider_user_id)');
        $this->addSql('CREATE INDEX IDX_6D5A4D83A76ED395 ON oauth_account (user_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE oauth_account');
    }
}
