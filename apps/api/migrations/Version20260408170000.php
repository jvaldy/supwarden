<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260408170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute la messagerie de groupe par trousseau et la messagerie privée utilisateur.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE vault_message (id SERIAL NOT NULL, vault_id INT NOT NULL, author_id INT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_5A4F779F5C89D057 ON vault_message (vault_id)');
        $this->addSql('CREATE INDEX IDX_5A4F779FF675F31B ON vault_message (author_id)');
        $this->addSql('CREATE INDEX idx_vault_message_vault_created_at ON vault_message (vault_id, created_at)');
        $this->addSql('COMMENT ON COLUMN vault_message.created_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('ALTER TABLE vault_message ADD CONSTRAINT FK_5A4F779F5C89D057 FOREIGN KEY (vault_id) REFERENCES vault (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE vault_message ADD CONSTRAINT FK_5A4F779FF675F31B FOREIGN KEY (author_id) REFERENCES app_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('CREATE TABLE private_message (id SERIAL NOT NULL, sender_id INT NOT NULL, recipient_id INT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_6887536DF624B39D ON private_message (sender_id)');
        $this->addSql('CREATE INDEX IDX_6887536DE92F8F78 ON private_message (recipient_id)');
        $this->addSql('CREATE INDEX idx_private_message_pair_created_at ON private_message (sender_id, recipient_id, created_at)');
        $this->addSql('CREATE INDEX idx_private_message_created_at ON private_message (created_at)');
        $this->addSql('COMMENT ON COLUMN private_message.created_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('ALTER TABLE private_message ADD CONSTRAINT FK_6887536DF624B39D FOREIGN KEY (sender_id) REFERENCES app_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE private_message ADD CONSTRAINT FK_6887536DE92F8F78 FOREIGN KEY (recipient_id) REFERENCES app_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE vault_message DROP CONSTRAINT FK_5A4F779F5C89D057');
        $this->addSql('ALTER TABLE vault_message DROP CONSTRAINT FK_5A4F779FF675F31B');
        $this->addSql('DROP TABLE vault_message');

        $this->addSql('ALTER TABLE private_message DROP CONSTRAINT FK_6887536DF624B39D');
        $this->addSql('ALTER TABLE private_message DROP CONSTRAINT FK_6887536DE92F8F78');
        $this->addSql('DROP TABLE private_message');
    }
}
