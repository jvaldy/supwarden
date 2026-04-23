<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\Validator\Exception\ValidationFailedException;

final class ApiRequestLifecycleSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly LoggerInterface $logger
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => 'onKernelRequest',
            KernelEvents::EXCEPTION => 'onKernelException',
            KernelEvents::RESPONSE => 'onKernelResponse',
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        if (!$this->isApiRequest($request)) {
            return;
        }

        $requestId = trim((string) $request->headers->get('X-Request-Id', ''));
        if ($requestId === '') {
            $requestId = bin2hex(random_bytes(10));
        }

        $request->attributes->set('request_id', $requestId);
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        if (!$this->isApiRequest($request)) {
            return;
        }

        $exception = $event->getThrowable();
        $statusCode = $this->resolveStatusCode($exception);
        $requestId = (string) $request->attributes->get('request_id', '');

        $payload = [
            'message' => $this->resolveMessage($exception, $statusCode),
            'status' => $statusCode,
            'code' => $this->resolveErrorCode($statusCode),
            'timestamp' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            'path' => $request->getPathInfo(),
            'requestId' => $requestId,
        ];

        if ($exception instanceof ValidationFailedException) {
            $errors = [];
            foreach ($exception->getViolations() as $violation) {
                $errors[] = [
                    'field' => (string) $violation->getPropertyPath(),
                    'message' => (string) $violation->getMessage(),
                ];
            }

            if ($errors !== []) {
                $payload['errors'] = $errors;
            }
        }

        if ($statusCode >= 500) {
            $this->logger->error('API exception', [
                'requestId' => $requestId,
                'path' => $request->getPathInfo(),
                'method' => $request->getMethod(),
                'exception' => $exception,
            ]);
        } else {
            $this->logger->warning('API request failed', [
                'requestId' => $requestId,
                'path' => $request->getPathInfo(),
                'method' => $request->getMethod(),
                'status' => $statusCode,
                'error' => $exception->getMessage(),
            ]);
        }

        $response = new JsonResponse($payload, $statusCode);
        if ($requestId !== '') {
            $response->headers->set('X-Request-Id', $requestId);
        }
        $event->setResponse($response);
    }

    public function onKernelResponse(ResponseEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        if (!$this->isApiRequest($request)) {
            return;
        }

        $requestId = (string) $request->attributes->get('request_id', '');
        if ($requestId !== '') {
            $event->getResponse()->headers->set('X-Request-Id', $requestId);
        }
    }

    private function isApiRequest(Request $request): bool
    {
        return str_starts_with($request->getPathInfo(), '/api');
    }

    private function resolveStatusCode(\Throwable $exception): int
    {
        if ($exception instanceof HttpExceptionInterface) {
            return $exception->getStatusCode();
        }

        if ($exception instanceof ValidationFailedException) {
            return Response::HTTP_UNPROCESSABLE_ENTITY;
        }

        if ($exception instanceof AccessDeniedException) {
            return Response::HTTP_FORBIDDEN;
        }

        return Response::HTTP_INTERNAL_SERVER_ERROR;
    }

    private function resolveErrorCode(int $statusCode): string
    {
        return match ($statusCode) {
            Response::HTTP_BAD_REQUEST => 'bad_request',
            Response::HTTP_UNAUTHORIZED => 'unauthorized',
            Response::HTTP_FORBIDDEN => 'forbidden',
            Response::HTTP_NOT_FOUND => 'not_found',
            Response::HTTP_UNPROCESSABLE_ENTITY => 'validation_error',
            Response::HTTP_TOO_MANY_REQUESTS => 'rate_limited',
            default => $statusCode >= 500 ? 'internal_error' : 'request_error',
        };
    }

    private function resolveMessage(\Throwable $exception, int $statusCode): string
    {
        if ($exception instanceof ValidationFailedException) {
            return 'Des donnees envoyees sont invalides.';
        }

        if ($exception instanceof AccessDeniedException || $exception instanceof AccessDeniedHttpException) {
            return 'Acces interdit.';
        }

        if ($exception instanceof NotFoundHttpException) {
            return 'Ressource introuvable.';
        }

        if ($exception instanceof HttpExceptionInterface && $statusCode < 500 && $exception->getMessage() !== '') {
            return $exception->getMessage();
        }

        if ($statusCode >= 500) {
            return 'Une erreur interne est survenue.';
        }

        return 'La requete a echoue.';
    }
}
