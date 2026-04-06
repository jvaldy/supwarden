<?php

namespace App\Controller\Auth;

use App\Entity\OAuthAccount;
use App\Entity\User;
use App\Repository\OAuthAccountRepository;
use App\Repository\UserRepository;
use App\Security\Token\BearerTokenManager;
use App\Security\OAuth\GoogleOAuthClientInterface;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

#[Route('/api/auth/oauth/google', name: 'api_auth_oauth_google_')]
final class GoogleOAuthController extends AbstractController
{
    private const SESSION_STATE_KEY = 'google_oauth_state';
    private const SESSION_PENDING_IDENTITY_KEY = 'google_oauth_pending_identity';

    #[OA\Get(
        path: '/api/auth/oauth/google/redirect',
        summary: 'Redirige vers Google pour d?marrer l?authentification OAuth2.',
        tags: ['Authentification']
    )]
    #[OA\Response(response: 302, description: 'Redirection vers Google.')]
    #[Route('/redirect', name: 'redirect', methods: ['GET'])]
    // Pr?pare l'?tat OAuth puis d?l?gue l'authentification ? Google.
    public function redirectToGoogle(Request $request, GoogleOAuthClientInterface $googleOAuthClient): RedirectResponse
    {
        $session = $request->getSession();
        $session->start();

        $oauthState = bin2hex(random_bytes(32));
        $session->set(self::SESSION_STATE_KEY, $oauthState);

        return $this->redirect($googleOAuthClient->buildAuthorizationUrl($oauthState));
    }

    #[OA\Get(
        path: '/api/auth/oauth/google/callback',
        summary: 'Finalise le retour Google et redirige le frontend.',
        tags: ['Authentification']
    )]
    #[OA\Response(response: 302, description: 'Redirection vers le frontend avec le r?sultat OAuth.')]
    #[Route('/callback', name: 'callback', methods: ['GET'])]
    // Traite le retour Google et d?cide entre connexion directe ou confirmation pr?alable.
    public function handleGoogleCallback(
        Request $request,
        GoogleOAuthClientInterface $googleOAuthClient,
        OAuthAccountRepository $oauthAccountRepository,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
        BearerTokenManager $bearerTokenManager
    ): RedirectResponse {
        $session = $request->getSession();
        $session->start();

        $expectedState = (string) $session->get(self::SESSION_STATE_KEY, '');
        $returnedState = (string) $request->query->get('state', '');
        $session->remove(self::SESSION_STATE_KEY);

        if ($expectedState === '' || $returnedState === '' || !hash_equals($expectedState, $returnedState)) {
            return $this->redirect($googleOAuthClient->buildFrontendRedirectUrl([
                'error' => 'Connexion Google invalide.',
            ]));
        }

        if ($request->query->has('error')) {
            return $this->redirect($googleOAuthClient->buildFrontendRedirectUrl([
                'error' => 'Connexion Google annul?e ou refus?e.',
            ]));
        }

        $authorizationCode = (string) $request->query->get('code', '');

        if ($authorizationCode === '') {
            return $this->redirect($googleOAuthClient->buildFrontendRedirectUrl([
                'error' => 'Code OAuth Google manquant.',
            ]));
        }

        try {
            $providerIdentity = $googleOAuthClient->fetchIdentityFromAuthorizationCode($authorizationCode);
        } catch (\RuntimeException $exception) {
            return $this->redirect($googleOAuthClient->buildFrontendRedirectUrl([
                'error' => $exception->getMessage(),
            ]));
        }

        if (!$providerIdentity->emailVerified) {
            return $this->redirect($googleOAuthClient->buildFrontendRedirectUrl([
                'error' => 'Le compte Google doit avoir une adresse e-mail v?rifi?e.',
            ]));
        }

        $oauthAccount = $oauthAccountRepository->findOneByProviderAndProviderUserId('google', $providerIdentity->providerUserId);
        $user = $oauthAccount?->getUser();

        if ($user !== null) {
            $oauthAccount
                ->setProviderEmail($providerIdentity->email)
                ->setProviderAvatarUrl($providerIdentity->avatarUrl);

            if ($user->getFirstname() === null && $providerIdentity->firstname !== null) {
                $user->setFirstname($providerIdentity->firstname);
            }

            if ($user->getLastname() === null && $providerIdentity->lastname !== null) {
                $user->setLastname($providerIdentity->lastname);
            }

            $entityManager->flush();

            return $this->redirect($googleOAuthClient->buildFrontendRedirectUrl([
                'token' => $bearerTokenManager->create($user),
            ]));
        }

        $existingUser = $userRepository->findOneByEmail($providerIdentity->email);

        $session->set(self::SESSION_PENDING_IDENTITY_KEY, [
            'provider' => 'google',
            'providerUserId' => $providerIdentity->providerUserId,
            'email' => $providerIdentity->email,
            'firstname' => $providerIdentity->firstname,
            'lastname' => $providerIdentity->lastname,
            'avatarUrl' => $providerIdentity->avatarUrl,
            'existingUserId' => $existingUser?->getId(),
        ]);

        return $this->redirect($googleOAuthClient->buildFrontendRedirectUrl([
            'status' => 'pending',
            'email' => $providerIdentity->email,
            'firstname' => $providerIdentity->firstname,
            'lastname' => $providerIdentity->lastname,
            'hasLocalAccount' => $existingUser !== null ? '1' : '0',
        ]));
    }

    #[OA\Post(
        path: '/api/auth/oauth/google/confirm',
        summary: 'Confirme la cr?ation ou la liaison du compte local apr?s retour Google.',
        tags: ['Authentification']
    )]
    #[OA\Response(response: 200, description: 'Compte local confirm? et session ouverte.')]
    #[OA\Response(response: 400, description: 'Aucune confirmation OAuth en attente.')]
    #[Route('/confirm', name: 'confirm', methods: ['POST'])]
    // Cr?e ou lie le compte local apr?s validation explicite du retour OAuth.
    public function confirmGoogleAccount(
        Request $request,
        UserRepository $userRepository,
        OAuthAccountRepository $oauthAccountRepository,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $entityManager,
        BearerTokenManager $bearerTokenManager,
        NormalizerInterface $normalizer
    ): JsonResponse {
        $session = $request->getSession();
        $session->start();

        /** @var array<string, mixed>|null $pendingIdentity */
        $pendingIdentity = $session->get(self::SESSION_PENDING_IDENTITY_KEY);

        if (!is_array($pendingIdentity)) {
            return $this->json([
                'message' => 'Aucune inscription Google en attente.',
            ], 400);
        }

        $session->remove(self::SESSION_PENDING_IDENTITY_KEY);

        $provider = (string) ($pendingIdentity['provider'] ?? '');
        $providerUserId = (string) ($pendingIdentity['providerUserId'] ?? '');
        $providerEmail = (string) ($pendingIdentity['email'] ?? '');

        if ($provider === '' || $providerUserId === '' || $providerEmail === '') {
            return $this->json([
                'message' => 'Les informations Google en attente sont incompl?tes.',
            ], 400);
        }

        $oauthAccount = $oauthAccountRepository->findOneByProviderAndProviderUserId($provider, $providerUserId);

        if ($oauthAccount instanceof OAuthAccount) {
            $user = $oauthAccount->getUser();

            return $this->json([
                'token' => $bearerTokenManager->create($user),
                'user' => $normalizer->normalize($user, null, ['groups' => ['user:read']]),
            ]);
        }

        $user = null;

        if (isset($pendingIdentity['existingUserId']) && is_int($pendingIdentity['existingUserId'])) {
            $user = $userRepository->find($pendingIdentity['existingUserId']);
        }

        if (!$user instanceof User) {
            $user = (new User())
                ->setEmail($providerEmail)
                ->setFirstname(isset($pendingIdentity['firstname']) ? (string) $pendingIdentity['firstname'] : null)
                ->setLastname(isset($pendingIdentity['lastname']) ? (string) $pendingIdentity['lastname'] : null)
                ->setIsActive(true)
                ->setHasLocalPassword(false);

            // Le mot de passe local reste inutilisable tant qu'aucun flux d?di? ne l'a d?fini.
            $generatedPassword = bin2hex(random_bytes(32));
            $user->setPassword($passwordHasher->hashPassword($user, $generatedPassword));
            $entityManager->persist($user);
        }

        $oauthAccount = (new OAuthAccount())
            ->setProvider($provider)
            ->setProviderUserId($providerUserId)
            ->setProviderEmail($providerEmail)
            ->setProviderAvatarUrl(isset($pendingIdentity['avatarUrl']) ? (string) $pendingIdentity['avatarUrl'] : null)
            ->setUser($user);

        $entityManager->persist($oauthAccount);
        $entityManager->flush();

        return $this->json([
            'token' => $bearerTokenManager->create($user),
            'user' => $normalizer->normalize($user, null, ['groups' => ['user:read']]),
        ]);
    }
}
