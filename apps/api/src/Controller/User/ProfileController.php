<?php

namespace App\Controller\User;

use App\Dto\User\DeleteAccountInput;
use App\Dto\User\UpdateProfileInput;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Security\BearerTokenManager;
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

final class ProfileController extends AbstractController
{
    #[OA\Patch(
        path: '/api/me',
        summary: 'Met à jour le profil de l’utilisateur connecté.',
        security: [['Bearer' => []]],
        tags: ['Utilisateur'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'firstname', type: 'string', nullable: true, example: 'Alice'),
                    new OA\Property(property: 'lastname', type: 'string', nullable: true, example: 'Martin'),
                    new OA\Property(property: 'email', type: 'string', nullable: true, format: 'email', example: 'alice@example.com'),
                    new OA\Property(property: 'currentPassword', type: 'string', nullable: true, example: 'motdepasse123'),
                    new OA\Property(property: 'newPassword', type: 'string', nullable: true, example: 'nouveaumotdepasse123'),
                ],
                type: 'object'
            )
        )
    )]
    #[OA\Response(response: 200, description: 'Profil mis à jour.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 422, description: 'Les données envoyées sont invalides.')]
    #[Route('/api/me', name: 'api_me_update', methods: ['PATCH'])]
    public function update(
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager,
        NormalizerInterface $normalizer,
        UserRepository $userRepository,
        UserPasswordHasherInterface $passwordHasher,
        BearerTokenManager $bearerTokenManager
    ): JsonResponse {
        if ($authenticatedUser === null) {
            return $this->json([
                'message' => 'Authentification requise.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $requestData = $this->decodeJsonRequest($request);

        if ($requestData instanceof JsonResponse) {
            return $requestData;
        }

        $updateProfileInput = new UpdateProfileInput();
        $updateProfileInput->firstname = array_key_exists('firstname', $requestData) ? (string) $requestData['firstname'] : null;
        $updateProfileInput->lastname = array_key_exists('lastname', $requestData) ? (string) $requestData['lastname'] : null;
        $updateProfileInput->email = array_key_exists('email', $requestData) ? (string) $requestData['email'] : null;
        $updateProfileInput->currentPassword = array_key_exists('currentPassword', $requestData) ? (string) $requestData['currentPassword'] : null;
        $updateProfileInput->newPassword = array_key_exists('newPassword', $requestData) ? (string) $requestData['newPassword'] : null;

        $validationErrors = $this->formatViolations($validator->validate($updateProfileInput));
        $this->validateEmailUpdate($updateProfileInput, $authenticatedUser, $userRepository, $validationErrors);
        $this->validatePasswordUpdate($updateProfileInput, $authenticatedUser, $passwordHasher, $validationErrors);

        if ($validationErrors !== []) {
            return $this->json([
                'message' => 'Les données fournies sont invalides.',
                'errors' => $validationErrors,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $authenticatedUser
            ->setFirstname($updateProfileInput->firstname)
            ->setLastname($updateProfileInput->lastname);

        if ($updateProfileInput->email !== null) {
            $authenticatedUser->setEmail($updateProfileInput->email);
        }

        $newToken = null;

        if ($updateProfileInput->newPassword !== null) {
            // N'applique le nouveau mot de passe qu'après contrôle du mot de passe actuel.
            $authenticatedUser->setPassword(
                $passwordHasher->hashPassword($authenticatedUser, $updateProfileInput->newPassword)
            );
            $authenticatedUser->incrementAuthTokenVersion();
            $newToken = $bearerTokenManager->create($authenticatedUser);
        }

        $entityManager->flush();

        return $this->json([
            'token' => $newToken,
            'user' => $normalizer->normalize($authenticatedUser, null, ['groups' => ['user:read']]),
        ]);
    }

    #[OA\Delete(
        path: '/api/me',
        summary: 'Supprime le compte de l’utilisateur connecté.',
        security: [['Bearer' => []]],
        tags: ['Utilisateur'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['currentPassword', 'confirmDeletion'],
                properties: [
                    new OA\Property(property: 'currentPassword', type: 'string', example: 'motdepasse123'),
                    new OA\Property(property: 'confirmDeletion', type: 'boolean', example: true),
                ],
                type: 'object'
            )
        )
    )]
    #[OA\Response(response: 200, description: 'Compte supprimé.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 422, description: 'Les données envoyées sont invalides.')]
    #[Route('/api/me', name: 'api_me_delete', methods: ['DELETE'])]
    public function delete(
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager,
        UserPasswordHasherInterface $passwordHasher
    ): JsonResponse {
        if ($authenticatedUser === null) {
            return $this->json([
                'message' => 'Authentification requise.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $requestData = $this->decodeJsonRequest($request);

        if ($requestData instanceof JsonResponse) {
            return $requestData;
        }

        $deleteAccountInput = new DeleteAccountInput();
        $deleteAccountInput->currentPassword = (string) ($requestData['currentPassword'] ?? '');
        $deleteAccountInput->confirmDeletion = (bool) ($requestData['confirmDeletion'] ?? false);

        $validationErrors = $this->formatViolations($validator->validate($deleteAccountInput));

        if (!$passwordHasher->isPasswordValid($authenticatedUser, $deleteAccountInput->currentPassword)) {
            $validationErrors['currentPassword'][] = 'Le mot de passe actuel est invalide.';
        }

        if ($validationErrors !== []) {
            return $this->json([
                'message' => 'Les données fournies sont invalides.',
                'errors' => $validationErrors,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Passe par Doctrine pour supprimer proprement le compte courant.
        $entityManager->remove($authenticatedUser);
        $entityManager->flush();

        return $this->json([
            'message' => 'Votre compte a bien été supprimé.',
        ]);
    }

    /**
     * @return array<string, mixed>|JsonResponse
     */
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
     * @param array<string, list<string>> $validationErrors
     */
    private function validateEmailUpdate(
        UpdateProfileInput $updateProfileInput,
        User $authenticatedUser,
        UserRepository $userRepository,
        array &$validationErrors
    ): void {
        if ($updateProfileInput->email === null) {
            return;
        }

        $normalizedEmail = mb_strtolower(trim($updateProfileInput->email));

        if ($normalizedEmail === '') {
            $validationErrors['email'][] = 'L’adresse e-mail est obligatoire.';
            return;
        }

        $existingUser = $userRepository->findOneByEmail($normalizedEmail);

        if ($existingUser !== null && $existingUser->getId() !== $authenticatedUser->getId()) {
            $validationErrors['email'][] = 'Cette adresse e-mail est déjà utilisée.';
        }
    }

    /**
     * @param array<string, list<string>> $validationErrors
     */
    private function validatePasswordUpdate(
        UpdateProfileInput $updateProfileInput,
        User $authenticatedUser,
        UserPasswordHasherInterface $passwordHasher,
        array &$validationErrors
    ): void {
        $newPassword = $updateProfileInput->newPassword !== null ? trim($updateProfileInput->newPassword) : null;
        $currentPassword = $updateProfileInput->currentPassword !== null ? trim($updateProfileInput->currentPassword) : null;

        if ($newPassword === null && $currentPassword === null) {
            return;
        }

        if ($newPassword === null || $newPassword === '') {
            $validationErrors['newPassword'][] = 'Le nouveau mot de passe est obligatoire.';
        }

        if ($currentPassword === null || $currentPassword === '') {
            $validationErrors['currentPassword'][] = 'Le mot de passe actuel est obligatoire.';
            return;
        }

        if ($newPassword !== null && $newPassword !== '' && !$passwordHasher->isPasswordValid($authenticatedUser, $currentPassword)) {
            $validationErrors['currentPassword'][] = 'Le mot de passe actuel est invalide.';
        }
    }

    /**
     * @param iterable<ConstraintViolationInterface> $constraintViolations
     * @return array<string, list<string>>
     */
    private function formatViolations(iterable $constraintViolations): array
    {
        // Regroupe les erreurs par champ pour l'affichage côté interface.
        $validationErrors = [];

        foreach ($constraintViolations as $constraintViolation) {
            $fieldName = $constraintViolation->getPropertyPath() ?: 'global';
            $validationErrors[$fieldName][] = $constraintViolation->getMessage();
        }

        return $validationErrors;
    }
}
