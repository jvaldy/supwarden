<?php

declare(strict_types=1);

namespace App\Tests\Functional;

final class VaultFlowTest extends ApiTestCase
{
    public function testUserCanCreatePersonalVaultByDefault(): void
    {
        $user = $this->createUser(['email' => 'owner@example.com']);
        $token = $this->authenticate($user);

        $this->client->jsonRequest('POST', '/api/vaults', [
            'name' => 'Trousseau personnel',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseStatusCodeSame(201);

        $responseData = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('Trousseau personnel', $responseData['vault']['name']);
        self::assertSame('PERSONAL', $responseData['vault']['type']);
        self::assertCount(1, $responseData['vault']['members']);
        self::assertSame('OWNER', $responseData['vault']['members'][0]['role']);
        self::assertArrayHasKey('updatedAt', $responseData['vault']);
    }

    public function testVaultTypeBecomesSharedWhenAnotherMemberJoinsAndReturnsToPersonalWhenTheyLeave(): void
    {
        $owner = $this->createUser(['email' => 'owner.shared@example.com']);
        $member = $this->createUser(['email' => 'member.shared@example.com']);
        $token = $this->authenticate($owner);

        $this->client->jsonRequest('POST', '/api/vaults', [
            'name' => 'Trousseau équipe',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        $vaultResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $vaultId = $vaultResponse['vault']['id'];

        self::assertSame('PERSONAL', $vaultResponse['vault']['type']);

        $this->client->jsonRequest('POST', sprintf('/api/vaults/%d/members', $vaultId), [
            'email' => $member->getEmail(),
            'role' => 'EDITOR',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseStatusCodeSame(201);

        $memberResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('EDITOR', $memberResponse['member']['role']);
        self::assertSame('SHARED', $memberResponse['vaultType']);

        $memberId = $memberResponse['member']['id'];

        $this->client->request('GET', sprintf('/api/vaults/%d', $vaultId), server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        $sharedVaultResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('SHARED', $sharedVaultResponse['vault']['type']);
        self::assertCount(2, $sharedVaultResponse['vault']['members']);

        $this->client->request('DELETE', sprintf('/api/vaults/%d/members/%d', $vaultId, $memberId), server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseIsSuccessful();

        $deleteResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('PERSONAL', $deleteResponse['vaultType']);

        $this->client->request('GET', sprintf('/api/vaults/%d', $vaultId), server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        $personalVaultResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('PERSONAL', $personalVaultResponse['vault']['type']);
        self::assertCount(1, $personalVaultResponse['vault']['members']);
    }

    public function testOwnerCanUpdateMemberRole(): void
    {
        $owner = $this->createUser(['email' => 'owner.role@example.com']);
        $member = $this->createUser(['email' => 'member.role@example.com']);
        $token = $this->authenticate($owner);

        $this->client->jsonRequest('POST', '/api/vaults', [
            'name' => 'Trousseau rôles',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        $vaultResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $vaultId = $vaultResponse['vault']['id'];

        $this->client->jsonRequest('POST', sprintf('/api/vaults/%d/members', $vaultId), [
            'email' => $member->getEmail(),
            'role' => 'EDITOR',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        $memberResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $memberId = $memberResponse['member']['id'];

        $this->client->jsonRequest('PATCH', sprintf('/api/vaults/%d/members/%d', $vaultId, $memberId), [
            'role' => 'VIEWER',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseIsSuccessful();

        $updatedMemberResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('VIEWER', $updatedMemberResponse['member']['role']);
    }

    public function testMemberCanLeaveSharedVaultWithoutOwnerRights(): void
    {
        $owner = $this->createUser(['email' => 'owner.leave@example.com']);
        $member = $this->createUser(['email' => 'member.leave@example.com']);
        $ownerToken = $this->authenticate($owner);
        $memberToken = $this->authenticate($member);

        $this->client->jsonRequest('POST', '/api/vaults', [
            'name' => 'Trousseau partagé',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $ownerToken),
        ]);

        $vaultResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $vaultId = $vaultResponse['vault']['id'];

        $this->client->jsonRequest('POST', sprintf('/api/vaults/%d/members', $vaultId), [
            'email' => $member->getEmail(),
            'role' => 'VIEWER',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $ownerToken),
        ]);

        $memberResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $memberId = $memberResponse['member']['id'];

        $this->client->request('DELETE', sprintf('/api/vaults/%d/members/%d', $vaultId, $memberId), server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $memberToken),
        ]);

        self::assertResponseIsSuccessful();

        $leaveResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('Vous avez bien quitté ce trousseau.', $leaveResponse['message']);
        self::assertSame('PERSONAL', $leaveResponse['vaultType']);
    }

    public function testOwnerCanUpdateVaultNameAndDescription(): void
    {
        $owner = $this->createUser(['email' => 'owner.meta@example.com']);
        $token = $this->authenticate($owner);

        $this->client->jsonRequest('POST', '/api/vaults', [
            'name' => 'Trousseau initial',
            'description' => 'Description initiale',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        $vaultResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $vaultId = $vaultResponse['vault']['id'];

        $this->client->jsonRequest('PATCH', sprintf('/api/vaults/%d', $vaultId), [
            'name' => 'Trousseau renommé',
            'description' => 'Description mise à jour',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseIsSuccessful();

        $updatedVaultResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('Trousseau renommé', $updatedVaultResponse['vault']['name']);
        self::assertSame('Description mise à jour', $updatedVaultResponse['vault']['description']);
        self::assertArrayHasKey('updatedAt', $updatedVaultResponse['vault']);
    }

    public function testListIsLimitedToAccessibleVaultsAndSupportsSearch(): void
    {
        $owner = $this->createUser(['email' => 'visible.owner@example.com']);
        $otherUser = $this->createUser(['email' => 'hidden.owner@example.com']);
        $token = $this->authenticate($owner);
        $otherToken = $this->authenticate($otherUser);

        $this->client->jsonRequest('POST', '/api/vaults', [
            'name' => 'Visible Alpha',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        $this->client->jsonRequest('POST', '/api/vaults', [
            'name' => 'Hidden Beta',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $otherToken),
        ]);

        $this->client->request('GET', '/api/vaults?q=Visible', server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseIsSuccessful();

        $responseData = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertCount(1, $responseData['vaults']);
        self::assertSame('Visible Alpha', $responseData['vaults'][0]['name']);
        self::assertSame('PERSONAL', $responseData['vaults'][0]['type']);
    }

    public function testNonMemberCannotOpenOrModifyVault(): void
    {
        $owner = $this->createUser(['email' => 'vault.owner@example.com']);
        $outsider = $this->createUser(['email' => 'vault.outsider@example.com']);
        $ownerToken = $this->authenticate($owner);
        $outsiderToken = $this->authenticate($outsider);

        $this->client->jsonRequest('POST', '/api/vaults', [
            'name' => 'Zone privée',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $ownerToken),
        ]);

        $vaultResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $vaultId = $vaultResponse['vault']['id'];

        $this->client->request('GET', sprintf('/api/vaults/%d', $vaultId), server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $outsiderToken),
        ]);

        self::assertResponseStatusCodeSame(403);

        $this->client->jsonRequest('PATCH', sprintf('/api/vaults/%d', $vaultId), [
            'name' => 'Modification interdite',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $outsiderToken),
        ]);

        self::assertResponseStatusCodeSame(403);
    }
}
