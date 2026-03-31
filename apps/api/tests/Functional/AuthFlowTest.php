<?php

namespace App\Tests\Functional;

use App\Repository\OAuthAccountRepository;
use App\Repository\UserRepository;
use App\Security\Token\BearerTokenManager;
use Symfony\Component\BrowserKit\Cookie;

final class AuthFlowTest extends ApiTestCase
{
    public function testUserCanRegisterAndFetchOwnProfile(): void
    {
        $this->client->jsonRequest('POST', '/api/auth/register', [
            'email' => 'camille@example.com',
            'password' => 'motdepasse123',
            'firstname' => 'Camille',
            'lastname' => 'Durand',
        ]);

        self::assertResponseStatusCodeSame(201);

        /** @var array{token:string,user:array<string,mixed>} $responseData */
        $responseData = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertArrayHasKey('token', $responseData);
        self::assertSame('camille@example.com', $responseData['user']['email']);
        self::assertTrue($responseData['user']['hasLocalPassword']);
        self::assertArrayNotHasKey('password', $responseData['user']);

        $this->client->request('GET', '/api/me', server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $responseData['token']),
        ]);

        self::assertResponseIsSuccessful();
    }

    public function testUserCanUpdateProfileEmailAndPassword(): void
    {
        $user = $this->createUser();
        $token = $this->authenticate($user);

        $this->client->jsonRequest('PATCH', '/api/me', [
            'firstname' => 'Camille',
            'lastname' => 'Bernard',
            'email' => 'camille.bernard@example.com',
            'currentPassword' => 'motdepasse123',
            'newPassword' => 'motdepasse12345',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseIsSuccessful();

        /** @var array{token:string,user:array<string,mixed>} $profileResponse */
        $profileResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('Camille', $profileResponse['user']['firstname']);
        self::assertSame('Bernard', $profileResponse['user']['lastname']);
        self::assertSame('camille.bernard@example.com', $profileResponse['user']['email']);
        self::assertTrue($profileResponse['user']['hasLocalPassword']);
        self::assertNotSame('', $profileResponse['token']);

        // Le changement de mot de passe invalide les jetons plus anciens.
        $this->client->request('GET', '/api/me', server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseStatusCodeSame(401);

        $this->client->request('GET', '/api/me', server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $profileResponse['token']),
        ]);

        self::assertResponseIsSuccessful();
    }

    public function testUserCannotReuseExistingEmailOrWrongCurrentPassword(): void
    {
        $this->createUser(['email' => 'existing@example.com']);
        $user = $this->createUser(['email' => 'other@example.com']);
        $token = $this->authenticate($user);

        $this->client->jsonRequest('PATCH', '/api/me', [
            'email' => 'existing@example.com',
            'currentPassword' => 'mauvais-mot-de-passe',
            'newPassword' => 'motdepasse12345',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseStatusCodeSame(422);

        /** @var array{errors:array<string,list<string>>} $errorResponse */
        $errorResponse = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertArrayHasKey('email', $errorResponse['errors']);
        self::assertArrayHasKey('currentPassword', $errorResponse['errors']);
    }

    public function testOAuthUserCanDefineALocalPasswordWithoutCurrentPassword(): void
    {
        $oauthUser = $this->createUser([
            'email' => 'oauth@example.com',
            'hasLocalPassword' => false,
        ]);
        $token = static::getContainer()->get(BearerTokenManager::class)->create($oauthUser);

        $this->client->jsonRequest('PATCH', '/api/me', [
            'newPassword' => 'motdepasse12345',
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseIsSuccessful();

        /** @var array{token:string,user:array<string,mixed>} $responseData */
        $responseData = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertTrue($responseData['user']['hasLocalPassword']);
        self::assertNotSame('', $responseData['token']);

        $this->client->jsonRequest('POST', '/api/auth/login', [
            'email' => 'oauth@example.com',
            'password' => 'motdepasse12345',
        ]);

        self::assertResponseIsSuccessful();
    }

    public function testUserCanDeleteOwnAccount(): void
    {
        $user = $this->createUser(['email' => 'delete@example.com']);
        $token = $this->authenticate($user);

        $this->client->jsonRequest('DELETE', '/api/me', [
            'currentPassword' => 'motdepasse123',
            'confirmDeletion' => true,
        ], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseIsSuccessful();

        $this->client->request('GET', '/api/me', server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseStatusCodeSame(401);

        $this->client->jsonRequest('POST', '/api/auth/login', [
            'email' => 'delete@example.com',
            'password' => 'motdepasse123',
        ]);

        self::assertResponseStatusCodeSame(401);
    }

    public function testUserCanLogoutAndInvalidateToken(): void
    {
        $user = $this->createUser();
        $token = $this->authenticate($user);

        $this->client->request('POST', '/api/auth/logout', server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseIsSuccessful();

        $this->client->request('GET', '/api/me', server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
        ]);

        self::assertResponseStatusCodeSame(401);
    }

    public function testAdminRouteIsReservedToAdministrators(): void
    {
        $standardUser = $this->createUser(['email' => 'user@example.com']);
        $adminUser = $this->createUser([
            'email' => 'admin@example.com',
            'roles' => ['ROLE_ADMIN'],
        ]);

        $standardToken = $this->authenticate($standardUser);

        $this->client->request('GET', '/api/admin/users', server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $standardToken),
        ]);

        self::assertResponseStatusCodeSame(403);

        $adminToken = $this->authenticate($adminUser);

        $this->client->request('GET', '/api/admin/users', server: [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $adminToken),
        ]);

        self::assertResponseIsSuccessful();

        /** @var array{users:list<array<string,mixed>>} $responseData */
        $responseData = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertCount(2, $responseData['users']);
    }

    public function testLoginIsRateLimitedAfterTooManyAttempts(): void
    {
        $user = $this->createUser(['email' => 'limited@example.com']);

        for ($attemptNumber = 0; $attemptNumber < 5; $attemptNumber++) {
            $this->client->jsonRequest('POST', '/api/auth/login', [
                'email' => $user->getEmail(),
                'password' => 'motdepasse-invalide',
            ], server: [
                'REMOTE_ADDR' => '10.10.10.10',
            ]);

            self::assertResponseStatusCodeSame(401);
        }

        $this->client->jsonRequest('POST', '/api/auth/login', [
            'email' => $user->getEmail(),
            'password' => 'motdepasse-invalide',
        ], server: [
            'REMOTE_ADDR' => '10.10.10.10',
        ]);

        self::assertResponseStatusCodeSame(429);
        self::assertTrue($this->client->getResponse()->headers->has('Retry-After'));
    }

    public function testGoogleOAuthRedirectStartsTheFlow(): void
    {
        $this->client->request('GET', '/api/auth/oauth/google/redirect');

        self::assertResponseRedirects();

        $redirectLocation = (string) $this->client->getResponse()->headers->get('Location');
        self::assertStringContainsString('https://accounts.google.com/o/oauth2/v2/auth', $redirectLocation);
        self::assertStringContainsString('state=', $redirectLocation);
    }

    public function testGoogleOAuthConfirmationRequiresExplicitConsent(): void
    {
        $this->client->jsonRequest('POST', '/api/auth/oauth/google/confirm', []);

        self::assertResponseStatusCodeSame(400);

        /** @var array{message:string} $responseData */
        $responseData = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('Aucune inscription Google en attente.', $responseData['message']);
    }

    public function testGoogleOAuthConfirmationCreatesTheLocalAccountAfterConsent(): void
    {
        $session = static::getContainer()->get('session.factory')->createSession();
        $session->set('google_oauth_pending_identity', [
            'provider' => 'google',
            'providerUserId' => 'google-user-123',
            'email' => 'google.user@example.com',
            'firstname' => 'Google',
            'lastname' => 'User',
            'avatarUrl' => 'https://example.com/avatar.png',
            'existingUserId' => null,
        ]);
        $session->save();

        $this->client->getCookieJar()->set(new Cookie($session->getName(), $session->getId()));
        $this->client->jsonRequest('POST', '/api/auth/oauth/google/confirm', []);

        self::assertResponseIsSuccessful();

        /** @var array{token:string,user:array<string,mixed>} $responseData */
        $responseData = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('google.user@example.com', $responseData['user']['email']);
        self::assertFalse($responseData['user']['hasLocalPassword']);
        self::assertNotSame('', $responseData['token']);

        $userRepository = static::getContainer()->get(UserRepository::class);
        $oauthAccountRepository = static::getContainer()->get(OAuthAccountRepository::class);

        self::assertSame(1, $userRepository->count([]));
        self::assertNotNull($oauthAccountRepository->findOneByProviderAndProviderUserId('google', 'google-user-123'));
    }
}