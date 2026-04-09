<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\PrivateMessage;
use App\Entity\VaultMessage;

final class MessagingFlowTest extends ApiTestCase
{
    public function testVaultGroupMessagingRespectsMembership(): void
    {
        $owner = $this->createUser([
            'email' => 'owner@example.com',
            'firstname' => 'Owner',
            'lastname' => 'One',
        ]);
        $member = $this->createUser([
            'email' => 'member@example.com',
            'firstname' => 'Member',
            'lastname' => 'Two',
        ]);
        $outsider = $this->createUser([
            'email' => 'outsider@example.com',
            'firstname' => 'Out',
            'lastname' => 'Sider',
        ]);

        $ownerToken = $this->authenticate($owner);
        $memberToken = $this->authenticate($member);
        $outsiderToken = $this->authenticate($outsider);

        $this->client->jsonRequest('POST', '/api/vaults', [
            'name' => 'Projet Messagerie',
            'description' => 'Canal equipe',
        ], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $ownerToken,
        ]);

        self::assertResponseStatusCodeSame(201);
        $createdVault = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $vaultId = (int) ($createdVault['vault']['id'] ?? 0);

        $this->client->jsonRequest('POST', sprintf('/api/vaults/%d/members', $vaultId), [
            'email' => $member->getEmail(),
            'role' => 'EDITOR',
        ], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $ownerToken,
        ]);

        self::assertResponseIsSuccessful();

        $plainTextMessage = 'Bonjour l equipe, point rapide a 15h.';

        $this->client->jsonRequest('POST', sprintf('/api/vaults/%d/messages', $vaultId), [
            'content' => $plainTextMessage,
        ], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $memberToken,
        ]);

        self::assertResponseStatusCodeSame(201);

        /** @var VaultMessage|null $storedVaultMessage */
        $storedVaultMessage = $this->entityManager->getRepository(VaultMessage::class)->findOneBy([]);
        self::assertNotNull($storedVaultMessage);
        self::assertNotSame($plainTextMessage, $storedVaultMessage->getContent());
        self::assertStringStartsWith('enc:v1:', $storedVaultMessage->getContent());

        $this->client->request('GET', sprintf('/api/vaults/%d/messages', $vaultId), server: [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $ownerToken,
        ]);

        self::assertResponseIsSuccessful();
        $messagesPayload = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertNotEmpty($messagesPayload['messages']);
        self::assertSame($plainTextMessage, $messagesPayload['messages'][0]['content']);

        $this->client->request('GET', sprintf('/api/vaults/%d/messages', $vaultId), server: [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $outsiderToken,
        ]);

        self::assertResponseStatusCodeSame(403);
    }

    public function testPrivateMessagingFlowMarksMessagesAsRead(): void
    {
        $sender = $this->createUser([
            'email' => 'sender@example.com',
            'firstname' => 'Sender',
            'lastname' => 'One',
        ]);
        $recipient = $this->createUser([
            'email' => 'recipient@example.com',
            'firstname' => 'Recipient',
            'lastname' => 'Two',
        ]);

        $senderToken = $this->authenticate($sender);
        $recipientToken = $this->authenticate($recipient);
        $plainTextMessage = 'Salut, peux-tu relire le trousseau Finance ?';

        $this->client->jsonRequest('POST', sprintf('/api/messages/private/%d', $recipient->getId()), [
            'content' => $plainTextMessage,
        ], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $senderToken,
        ]);

        self::assertResponseStatusCodeSame(201);

        /** @var PrivateMessage|null $storedPrivateMessage */
        $storedPrivateMessage = $this->entityManager->getRepository(PrivateMessage::class)->findOneBy([]);
        self::assertNotNull($storedPrivateMessage);
        self::assertNotSame($plainTextMessage, $storedPrivateMessage->getContent());
        self::assertStringStartsWith('enc:v1:', $storedPrivateMessage->getContent());
        self::assertNull($storedPrivateMessage->getReadAt());

        $this->client->request('GET', '/api/messages/private/contacts', server: [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $recipientToken,
        ]);

        self::assertResponseIsSuccessful();
        $contactsPayload = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame(1, $contactsPayload['totalUnreadCount']);
        self::assertSame(1, $contactsPayload['contacts'][0]['unreadCount']);

        $this->client->request('GET', sprintf('/api/messages/private/%d', $sender->getId()), server: [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $recipientToken,
        ]);

        self::assertResponseIsSuccessful();
        $messagesPayload = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame(1, $messagesPayload['unreadMarkedCount']);
        self::assertNotEmpty($messagesPayload['messages']);
        self::assertSame($plainTextMessage, $messagesPayload['messages'][0]['content']);
        self::assertTrue($messagesPayload['messages'][0]['isRead']);
        self::assertNotNull($messagesPayload['messages'][0]['readAt']);

        $this->entityManager->refresh($storedPrivateMessage);
        self::assertNotNull($storedPrivateMessage->getReadAt());

        $this->client->jsonRequest('POST', sprintf('/api/messages/private/%d', $sender->getId()), [
            'content' => 'Message a soi-meme',
        ], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $senderToken,
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testPrivateContactsListsSharedVaultMembersAndExistingConversations(): void
    {
        $owner = $this->createUser([
            'email' => 'owner@example.com',
            'firstname' => 'Owner',
            'lastname' => 'One',
        ]);
        $sharedMember = $this->createUser([
            'email' => 'shared@example.com',
            'firstname' => 'Shared',
            'lastname' => 'Member',
        ]);
        $privateOnly = $this->createUser([
            'email' => 'private@example.com',
            'firstname' => 'Private',
            'lastname' => 'Only',
        ]);

        $ownerToken = $this->authenticate($owner);

        $this->client->jsonRequest('POST', '/api/vaults', [
            'name' => 'Projet commun',
            'description' => 'Canal commun',
        ], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $ownerToken,
        ]);

        self::assertResponseStatusCodeSame(201);
        $createdVault = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $vaultId = (int) ($createdVault['vault']['id'] ?? 0);

        $this->client->jsonRequest('POST', sprintf('/api/vaults/%d/members', $vaultId), [
            'email' => $sharedMember->getEmail(),
            'role' => 'VIEWER',
        ], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $ownerToken,
        ]);
        self::assertResponseStatusCodeSame(201);

        $this->client->jsonRequest('POST', sprintf('/api/messages/private/%d', $privateOnly->getId()), [
            'content' => 'Salut en prive',
        ], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $ownerToken,
        ]);
        self::assertResponseStatusCodeSame(201);

        $this->client->request('GET', '/api/messages/private/contacts', server: [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $ownerToken,
        ]);

        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertCount(2, $payload['contacts']);
        self::assertSame([
            $sharedMember->getId(),
            $privateOnly->getId(),
        ], array_column($payload['contacts'], 'id'));
    }
}
