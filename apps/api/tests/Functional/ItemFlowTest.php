<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Symfony\Component\HttpFoundation\File\UploadedFile;

final class ItemFlowTest extends ApiTestCase
{
    public function testOwnerCanCreateListUpdateAndDeleteItem(): void
    {
        $owner = $this->createUser(['email' => 'items.owner@example.com']);
        $token = $this->authenticate($owner);

        $this->client->jsonRequest('POST', '/api/vaults', [
            'name' => 'Trousseau items',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        $vaultResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $vaultId = $vaultResponse['vault']['id'];

        $this->client->jsonRequest('POST', sprintf('/api/vaults/%d/items', $vaultId), [
            'name' => 'Netflix',
            'username' => 'camille@example.com',
            'secret' => 'super-secret',
            'notes' => 'Compte principal',
            'uris' => [
                ['label' => 'Connexion', 'uri' => 'https://www.netflix.com/login'],
            ],
            'customFields' => [
                ['label' => 'Profil', 'type' => 'text', 'value' => 'Famille', 'isSensitive' => false],
            ],
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseStatusCodeSame(201);

        $createResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $itemId = $createResponse['item']['id'];

        self::assertSame('Netflix', $createResponse['item']['name']);
        self::assertCount(1, $createResponse['item']['uris']);
        self::assertCount(1, $createResponse['item']['customFields']);

        $this->client->request('GET', sprintf('/api/vaults/%d/items', $vaultId), server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseIsSuccessful();
        $listResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertCount(1, $listResponse['items']);
        self::assertNull($listResponse['items'][0]['secret']);
        self::assertTrue($listResponse['items'][0]['hasSecret']);

        $this->client->request('GET', sprintf('/api/items/%d', $itemId), server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseIsSuccessful();
        $showResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('super-secret', $showResponse['item']['secret']);

        $this->client->jsonRequest('PATCH', sprintf('/api/items/%d', $itemId), [
            'name' => 'Netflix foyer',
            'username' => 'camille.maison@example.com',
            'secret' => 'secret-mis-a-jour',
            'notes' => 'Compte maison',
            'uris' => [
                ['label' => 'Connexion', 'uri' => 'https://www.netflix.com/login'],
                ['label' => 'Aide', 'uri' => 'https://help.netflix.com/fr'],
            ],
            'customFields' => [
                ['label' => 'Profil', 'type' => 'text', 'value' => 'Salon', 'isSensitive' => false],
                ['label' => 'Code PIN', 'type' => 'text', 'value' => '1234', 'isSensitive' => true],
            ],
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseIsSuccessful();
        $updateResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('Netflix foyer', $updateResponse['item']['name']);
        self::assertCount(2, $updateResponse['item']['uris']);
        self::assertCount(2, $updateResponse['item']['customFields']);

        $this->client->request('DELETE', sprintf('/api/items/%d', $itemId), server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseIsSuccessful();
    }

    public function testViewerCannotCreateOrEditItem(): void
    {
        $owner = $this->createUser(['email' => 'items.owner.viewer@example.com']);
        $viewer = $this->createUser(['email' => 'items.viewer@example.com']);
        $ownerToken = $this->authenticate($owner);
        $viewerToken = $this->authenticate($viewer);

        $this->client->jsonRequest('POST', '/api/vaults', [
            'name' => 'Trousseau partage',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $ownerToken),
        ]);

        $vaultResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $vaultId = $vaultResponse['vault']['id'];

        $this->client->jsonRequest('POST', sprintf('/api/vaults/%d/members', $vaultId), [
            'email' => $viewer->getEmail(),
            'role' => 'VIEWER',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $ownerToken),
        ]);

        $this->client->jsonRequest('POST', sprintf('/api/vaults/%d/items', $vaultId), [
            'name' => 'Netflix',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $viewerToken),
        ]);

        self::assertResponseStatusCodeSame(403);
    }

    public function testEditorCanUploadAndDeleteAttachment(): void
    {
        $owner = $this->createUser(['email' => 'items.owner.attach@example.com']);
        $editor = $this->createUser(['email' => 'items.editor.attach@example.com']);
        $ownerToken = $this->authenticate($owner);
        $editorToken = $this->authenticate($editor);

        $this->client->jsonRequest('POST', '/api/vaults', [
            'name' => 'Trousseau documents',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $ownerToken),
        ]);

        $vaultResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $vaultId = $vaultResponse['vault']['id'];

        $this->client->jsonRequest('POST', sprintf('/api/vaults/%d/members', $vaultId), [
            'email' => $editor->getEmail(),
            'role' => 'EDITOR',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $ownerToken),
        ]);

        $this->client->jsonRequest('POST', sprintf('/api/vaults/%d/items', $vaultId), [
            'name' => 'Abonnement',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $ownerToken),
        ]);

        $itemResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $itemId = $itemResponse['item']['id'];

        $temporaryFile = tempnam(sys_get_temp_dir(), 'supwarden-item');
        file_put_contents($temporaryFile, 'piece jointe test');
        $uploadedFile = new UploadedFile($temporaryFile, 'justificatif.txt', 'text/plain', null, true);

        $this->client->request(
            'POST',
            sprintf('/api/items/%d/attachments', $itemId),
            server: ['HTTP_AUTHORIZATION' => sprintf('Bearer %s', $editorToken)],
            files: ['file' => $uploadedFile]
        );

        self::assertResponseStatusCodeSame(201);

        $attachmentResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $attachmentId = $attachmentResponse['attachment']['id'];

        $this->client->request('DELETE', sprintf('/api/attachments/%d', $attachmentId), server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $editorToken),
        ]);

        self::assertResponseIsSuccessful();
    }

    public function testSensitiveItemRequiresValidPinToUnlockSecret(): void
    {
        $owner = $this->createUser(['email' => 'items.owner.pin@example.com']);
        $token = $this->authenticate($owner);

        $this->client->jsonRequest('PATCH', '/api/me', [
            'newPin' => '1234',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseIsSuccessful();

        $this->client->jsonRequest('POST', '/api/vaults', [
            'name' => 'Trousseau secret',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        $vaultResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $vaultId = $vaultResponse['vault']['id'];

        $this->client->jsonRequest('POST', sprintf('/api/vaults/%d/items', $vaultId), [
            'name' => 'Twitch',
            'secret' => 'super-secret',
            'isSensitive' => true,
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseStatusCodeSame(201);
        $itemResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $itemId = $itemResponse['item']['id'];

        $this->client->jsonRequest('POST', sprintf('/api/items/%d/unlock-secret', $itemId), [], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseStatusCodeSame(422);

        $this->client->jsonRequest('POST', sprintf('/api/items/%d/unlock-secret', $itemId), [
            'pin' => '9999',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseStatusCodeSame(403);

        $this->client->jsonRequest('POST', sprintf('/api/items/%d/unlock-secret', $itemId), [
            'pin' => '1234',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseIsSuccessful();
        $unlockResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('super-secret', $unlockResponse['secret']);
    }
}
