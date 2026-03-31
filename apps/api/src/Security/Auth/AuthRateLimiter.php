<?php

namespace App\Security\Auth;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactory;

final class AuthRateLimiter
{
    public function __construct(
        private readonly RateLimiterFactory $loginLimiter,
        private readonly RateLimiterFactory $registerLimiter
    ) {
    }

    public function consumeFailedLoginAttempt(Request $request): ?JsonResponse
    {
        return $this->consume($this->loginLimiter, $request, 'auth_login_failed');
    }

    public function consumeRegistrationAttempt(Request $request): ?JsonResponse
    {
        return $this->consume($this->registerLimiter, $request, 'auth_register_attempt');
    }

    public function resetLoginAttempts(Request $request): void
    {
        $this->loginLimiter->create($this->buildKey($request, 'auth_login_failed'))->reset();
    }

    private function consume(RateLimiterFactory $limiterFactory, Request $request, string $scope): ?JsonResponse
    {
        $limiter = $limiterFactory->create($this->buildKey($request, $scope));
        $limit = $limiter->consume(1);

        if ($limit->isAccepted()) {
            return null;
        }

        $retryAfter = $limit->getRetryAfter();
        $headers = [];

        if ($retryAfter !== null) {
            $headers['Retry-After'] = (string) max(1, $retryAfter->getTimestamp() - time());
        }

        return new JsonResponse([
            'message' => 'Trop de tentatives. Réessayez dans un instant.',
        ], Response::HTTP_TOO_MANY_REQUESTS, $headers);
    }

    private function buildKey(Request $request, string $scope): string
    {
        $clientIpAddress = $request->getClientIp() ?? 'unknown';

        return sprintf('%s:%s', $scope, $clientIpAddress);
    }
}
