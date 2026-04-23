<?php

declare(strict_types=1);

namespace App\Security\Auth;

use App\Repository\UserRepository;
use App\Security\Token\BearerTokenManager;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;

final class ApiTokenAuthenticator extends AbstractAuthenticator implements AuthenticationEntryPointInterface
{
    public function __construct(
        private readonly BearerTokenManager $bearerTokenManager,
        private readonly UserRepository $userRepository
    ) {
    }

    public function supports(Request $request): ?bool
    {
        $authorizationHeader = $request->headers->get('Authorization');

        return is_string($authorizationHeader) && str_starts_with($authorizationHeader, 'Bearer ');
    }

    public function authenticate(Request $request): Passport
    {
        $authorizationHeader = $request->headers->get('Authorization', '');
        $bearerToken = trim(substr($authorizationHeader, 7));
        $tokenPayload = $this->bearerTokenManager->parse($bearerToken);

        if ($tokenPayload === null || $tokenPayload['sub'] <= 0) {
            throw new CustomUserMessageAuthenticationException("Le jeton d'authentification est invalide ou expiré.");
        }

        return new SelfValidatingPassport(
            new UserBadge((string) $tokenPayload['sub'], function (string $userIdentifier) use ($tokenPayload) {
                $authenticatedUser = $this->userRepository->findActiveById((int) $userIdentifier);

                if ($authenticatedUser === null) {
                    throw new CustomUserMessageAuthenticationException('Utilisateur introuvable ou inactif.');
                }

                if ($authenticatedUser->getAuthTokenVersion() !== $tokenPayload['version']) {
                    throw new CustomUserMessageAuthenticationException("Le jeton d'authentification n'est plus valide.");
                }

                return $authenticatedUser;
            })
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        return null;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $authenticationException): ?Response
    {
        return new JsonResponse([
            'message' => $authenticationException->getMessageKey(),
        ], Response::HTTP_UNAUTHORIZED);
    }

    public function start(Request $request, AuthenticationException $authenticationException = null): Response
    {
        return new JsonResponse([
            'message' => 'Authentification requise.',
        ], Response::HTTP_UNAUTHORIZED);
    }
}

