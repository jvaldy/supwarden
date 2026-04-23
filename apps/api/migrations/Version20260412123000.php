<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260412123000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Normalise le préfixe SW_ en tables PostgreSQL non sensibles à la casse (sw_).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE IF EXISTS "SW_attachment" RENAME TO sw_attachment');
        $this->addSql('ALTER TABLE IF EXISTS "SW_custom_field" RENAME TO sw_custom_field');
        $this->addSql('ALTER TABLE IF EXISTS "SW_item_permission" RENAME TO sw_item_permission');
        $this->addSql('ALTER TABLE IF EXISTS "SW_item_uri" RENAME TO sw_item_uri');
        $this->addSql('ALTER TABLE IF EXISTS "SW_oauth_account" RENAME TO sw_oauth_account');
        $this->addSql('ALTER TABLE IF EXISTS "SW_private_message" RENAME TO sw_private_message');
        $this->addSql('ALTER TABLE IF EXISTS "SW_app_user" RENAME TO sw_app_user');
        $this->addSql('ALTER TABLE IF EXISTS "SW_vault" RENAME TO sw_vault');
        $this->addSql('ALTER TABLE IF EXISTS "SW_vault_item" RENAME TO sw_vault_item');
        $this->addSql('ALTER TABLE IF EXISTS "SW_vault_member" RENAME TO sw_vault_member');
        $this->addSql('ALTER TABLE IF EXISTS "SW_vault_message" RENAME TO sw_vault_message');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE IF EXISTS sw_attachment RENAME TO "SW_attachment"');
        $this->addSql('ALTER TABLE IF EXISTS sw_custom_field RENAME TO "SW_custom_field"');
        $this->addSql('ALTER TABLE IF EXISTS sw_item_permission RENAME TO "SW_item_permission"');
        $this->addSql('ALTER TABLE IF EXISTS sw_item_uri RENAME TO "SW_item_uri"');
        $this->addSql('ALTER TABLE IF EXISTS sw_oauth_account RENAME TO "SW_oauth_account"');
        $this->addSql('ALTER TABLE IF EXISTS sw_private_message RENAME TO "SW_private_message"');
        $this->addSql('ALTER TABLE IF EXISTS sw_app_user RENAME TO "SW_app_user"');
        $this->addSql('ALTER TABLE IF EXISTS sw_vault RENAME TO "SW_vault"');
        $this->addSql('ALTER TABLE IF EXISTS sw_vault_item RENAME TO "SW_vault_item"');
        $this->addSql('ALTER TABLE IF EXISTS sw_vault_member RENAME TO "SW_vault_member"');
        $this->addSql('ALTER TABLE IF EXISTS sw_vault_message RENAME TO "SW_vault_message"');
    }
}
