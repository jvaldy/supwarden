<?php

namespace App\Controller\Auth;

use App\Dto\Auth\LoginInput;
use App\Dto\Auth\RegisterInput;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Security\Auth\AuthRateLimiter;
use App\Security\Token\BearerTokenManager;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;
use Symfony\Component\Validator\ConstraintViolationInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/auth', name: 'api_auth_')]
final class AuthController extends AbstractController
{
    #[OA\Post(
        path: '/api/auth/register',
        summary: 'Inscrit un nouvel utilisateur.',
        tags: ['Authentification'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'password'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'alice@example.com'),
                    new OA\Property(property: 'password', type: 'string', example: 'motdepasse123'),
                    new OA\Property(property: 'firstname', type: 'string', nullable: true, example: 'Alice'),
                    new OA\Property(property: 'lastname', type: 'string', nullable: true, example: 'Martin'),
                ],
                type: 'object'
            )
        )
    )]
    #[OA\Response(response: 201, description: "Utilisateur créé et jeton d'authentification retourné.")]
    #[OA\Response(response: 422, description: 'Les données envoyées sont invalides.')]
    #[Route('/register', name: 'register', methods: ['POST'])]
    // Gère l'inscription classique puis ouvre immédiatement une session API.
    public function register(
        Request $request,
        ValidatorInterface $validator,
        UserRepository $userRepository,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $entityManager,
        AuthRateLimiter $authRateLimiter,
        BearerTokenManager $bearerTokenManager,
        NormalizerInterface $normalizer
    ): JsonResponse {
        $requestData = $this->decodeJsonRequest($request);

        if ($requestData instanceof JsonResponse) {
            return $requestData;
        }

        $registerInput = new RegisterInput();
        $registerInput->email = (string) ($requestData['email'] ?? '');
        $registerInput->password = (string) ($requestData['password'] ?? '');
        $registerInput->firstname = isset($requestData['firstname']) ? (string) $requestData['firstname'] : null;
        $registerInput->lastname = isset($requestData['lastname']) ? (string) $requestData['lastname'] : null;

        $validationErrors = $this->formatViolations($validator->validate($registerInput));

        if ($userRepository->findOneByEmail($registerInput->email) !== null) {
            $validationErrors['email'][] = 'Cette adresse e-mail est déjà utilisée.';
        }

        if ($validationErrors !== []) {
            return $this->json([
                'message' => 'Les données fournies sont invalides.',
                'errors' => $validationErrors,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Le mot de passe n'est jamais persisté en clair.
        $user = (new User())
            ->setEmail($registerInput->email)
            ->setFirstname($registerInput->firstname)
            ->setLastname($registerInput->lastname)
            ->setIsActive(true);

        $hashedPassword = $passwordHasher->hashPassword($user, $registerInput->password);
        $user->setPassword($hashedPassword);

        $rateLimitResponse = $authRateLimiter->consumeRegistrationAttempt($request);

        if ($rateLimitResponse instanceof JsonResponse) {
            return $rateLimitResponse;
        }

        $entityManager->persist($user);
        $entityManager->flush();

        return $this->json([
            'token' => $bearerTokenManager->create($user),
            'user' => $normalizer->normalize($user, null, ['groups' => ['user:read']]),
        ], Response::HTTP_CREATED);
    }

    #[OA\Post(
        path: '/api/auth/login',
        summary: 'Authentifie un utilisateur existant.',
        tags: ['Authentification'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'password'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'alice@example.com'),
                    new OA\Property(property: 'password', type: 'string', example: 'motdepasse123'),
                ],
                type: 'object'
            )
        )
    )]
    #[OA\Response(response: 200, description: "Jeton d'authentification et utilisateur courant.")]
    #[OA\Response(response: 401, description: 'Identifiants invalides.')]
    #[OA\Response(response: 422, description: 'Les données envoyées sont invalides.')]
    #[Route('/login', name: 'login', methods: ['POST'])]
    // Authentifie un utilisateur local et applique la protection anti-bruteforce.
    public function login(
        Request $request,
        ValidatorInterface $validator,
        UserRepository $userRepository,
        UserPasswordHasherInterface $passwordHasher,
        AuthRateLimiter $authRateLimiter,
        BearerTokenManager $bearerTokenManager,
        NormalizerInterface $normalizer
    ): JsonResponse {
        $requestData = $this->decodeJsonRequest($request);

        if ($requestData instanceof JsonResponse) {
            return $requestData;
        }

        $loginInput = new LoginInput();
        $loginInput->email = (string) ($requestData['email'] ?? '');
        $loginInput->password = (string) ($requestData['password'] ?? '');

        $validationErrors = $this->formatViolations($validator->validate($loginInput));

        if ($validationErrors !== []) {
            return $this->json([
                'message' => 'Les données fournies sont invalides.',
                'errors' => $validationErrors,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user = $userRepository->findOneByEmail($loginInput->email);
        $passwordIsValid = $user !== null && $passwordHasher->isPasswordValid($user, $loginInput->password);

        if ($user === null || !$user->isActive() || !$passwordIsValid) {
            $rateLimitResponse = $authRateLimiter->consumeFailedLoginAttempt($request);

            if ($rateLimitResponse instanceof JsonResponse) {
                return $rateLimitResponse;
            }

            return $this->json([
                'message' => 'Identifiants invalides.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $authRateLimiter->resetLoginAttempts($request);

        return $this->json([
            'token' => $bearerTokenManager->create($user),
            'user' => $normalizer->normalize($user, null, ['groups' => ['user:read']]),
        ]);
    }

    #[OA\Post(
        path: '/api/auth/logout',
        summary: 'Invalide le jeton courant côté serveur.',
        security: [['Bearer' => []]],
        tags: ['Authentification']
    )]
    #[OA\Response(response: 200, description: 'Session invalidée côté serveur.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[Route('/logout', name: 'logout', methods: ['POST'])]
    // Invalide les jetons encore en circulation pour ce compte.
    public function logout(
        #[CurrentUser] ?User $authenticatedUser,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        if ($authenticatedUser === null) {
            return $this->json([
                'message' => 'Authentification requise.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Incrémente la version attendue pour invalider tous les jetons plus anciens.
        $authenticatedUser->incrementAuthTokenVersion();
        $entityManager->flush();

        return $this->json([
            'message' => 'Déconnexion prise en compte côté serveur.',
        ]);
    }

    /**
     * @return array<string, mixed>|JsonResponse
     */
    // Refuse les requêtes vides ou non JSON avant d'entrer dans la logique métier.
    private function decodeJsonRequest(Request $request): array|JsonResponse
    {
        $requestContent = $request->getContent();

        if ($requestContent === '') {
            return new JsonResponse([
                'message' => 'Le corps de la requête JSON est requis.',
            ], Response::HTTP_BAD_REQUEST);
        }

        try {
            $decodedRequestData = json_decode($requestContent, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return new JsonResponse([
                'message' => 'Le JSON fourni est invalide.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($decodedRequestData)) {
            return new JsonResponse([
                'message' => 'Le corps de la requête doit être un objet JSON.',
            ], Response::HTTP_BAD_REQUEST);
        }

        return $decodedRequestData;
    }

    /**
     * @param iterable<ConstraintViolationInterface> $constraintViolations
     * @return array<string, list<string>>
     */
    // Ramène les violations Symfony dans un format directement exploitable côté interface.
    private function formatViolations(iterable $constraintViolations): array
    {
        // Regroupe les erreurs par champ pour simplifier l'exploitation côté frontend.
        $validationErrors = [];

        foreach ($constraintViolations as $constraintViolation) {
            $fieldName = $constraintViolation->getPropertyPath() ?: 'global';
            $validationErrors[$fieldName][] = $constraintViolation->getMessage();
        }

        return $validationErrors;
    }
}

