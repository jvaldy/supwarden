<?php

namespace App\Tests\Functional;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

abstract class ApiTestCase extends WebTestCase
{
    protected KernelBrowser $client;
    protected EntityManagerInterface $entityManager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client = static::createClient();
        $this->entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $this->resetDatabase();
    }

    protected function createUser(array $overrides = []): User
    {
        $passwordHasher = static::getContainer()->get(UserPasswordHasherInterface::class);

        $user = (new User())
            ->setEmail($overrides['email'] ?? 'user@example.com')
            ->setFirstname($overrides['firstname'] ?? 'Alice')
            ->setLastname($overrides['lastname'] ?? 'Martin')
            ->setIsActive($overrides['isActive'] ?? true)
            ->setRoles($overrides['roles'] ?? ['ROLE_USER']);

        $hashedPassword = $passwordHasher->hashPassword($user, $overrides['password'] ?? 'motdepasse123');
        $user->setPassword($hashedPassword);

        if (isset($overrides['authTokenVersion'])) {
            $user->setAuthTokenVersion($overrides['authTokenVersion']);
        }

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    protected function authenticate(User $user, string $plainPassword = 'motdepasse123'): string
    {
        $this->client->jsonRequest('POST', '/api/auth/login', [
            'email' => $user->getEmail(),
            'password' => $plainPassword,
        ]);

        self::assertResponseIsSuccessful();

        /** @var array{token:string} $responseData */
        $responseData = json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        return $responseData['token'];
    }

    private function resetDatabase(): void
    {
        $connection = $this->entityManager->getConnection();
        $schemaManager = $connection->createSchemaManager();
        $schemaTool = new SchemaTool($this->entityManager);
        $metadata = $this->entityManager->getMetadataFactory()->getAllMetadata();

        $connection->executeStatement('PRAGMA foreign_keys = OFF');

        foreach ($schemaManager->listTableNames() as $tableName) {
            $connection->executeStatement(sprintf('DROP TABLE IF EXISTS "%s"', $tableName));
        }

        if ($metadata !== []) {
            $schemaTool->createSchema($metadata);
        }

        $connection->executeStatement('PRAGMA foreign_keys = ON');
    }
}
