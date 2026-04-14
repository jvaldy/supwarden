<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260412110000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute le préfixe SW_ sur les tables métier.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE IF EXISTS attachment RENAME TO "SW_attachment"');
        $this->addSql('ALTER TABLE IF EXISTS custom_field RENAME TO "SW_custom_field"');
        $this->addSql('ALTER TABLE IF EXISTS item_permission RENAME TO "SW_item_permission"');
        $this->addSql('ALTER TABLE IF EXISTS item_uri RENAME TO "SW_item_uri"');
        $this->addSql('ALTER TABLE IF EXISTS oauth_account RENAME TO "SW_oauth_account"');
        $this->addSql('ALTER TABLE IF EXISTS private_message RENAME TO "SW_private_message"');
        $this->addSql('ALTER TABLE IF EXISTS app_user RENAME TO "SW_app_user"');
        $this->addSql('ALTER TABLE IF EXISTS vault RENAME TO "SW_vault"');
        $this->addSql('ALTER TABLE IF EXISTS vault_item RENAME TO "SW_vault_item"');
        $this->addSql('ALTER TABLE IF EXISTS vault_member RENAME TO "SW_vault_member"');
        $this->addSql('ALTER TABLE IF EXISTS vault_message RENAME TO "SW_vault_message"');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE IF EXISTS "SW_attachment" RENAME TO attachment');
        $this->addSql('ALTER TABLE IF EXISTS "SW_custom_field" RENAME TO custom_field');
        $this->addSql('ALTER TABLE IF EXISTS "SW_item_permission" RENAME TO item_permission');
        $this->addSql('ALTER TABLE IF EXISTS "SW_item_uri" RENAME TO item_uri');
        $this->addSql('ALTER TABLE IF EXISTS "SW_oauth_account" RENAME TO oauth_account');
        $this->addSql('ALTER TABLE IF EXISTS "SW_private_message" RENAME TO private_message');
        $this->addSql('ALTER TABLE IF EXISTS "SW_app_user" RENAME TO app_user');
        $this->addSql('ALTER TABLE IF EXISTS "SW_vault" RENAME TO vault');
        $this->addSql('ALTER TABLE IF EXISTS "SW_vault_item" RENAME TO vault_item');
        $this->addSql('ALTER TABLE IF EXISTS "SW_vault_member" RENAME TO vault_member');
        $this->addSql('ALTER TABLE IF EXISTS "SW_vault_message" RENAME TO vault_message');
    }
}
