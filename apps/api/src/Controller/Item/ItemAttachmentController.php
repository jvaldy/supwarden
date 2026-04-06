<?php
declare(strict_types=1);

namespace App\Controller\Item;

use App\Entity\Attachment;
use App\Entity\User;
use App\Repository\AttachmentRepository;
use App\Repository\VaultItemRepository;
use App\Security\Vault\ItemVoter;
use App\Service\ItemAttachmentStorage;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api', name: 'api_item_attachments_')]
final class ItemAttachmentController extends AbstractController
{
    private const MAX_FILE_SIZE = 5242880;

    // Liste volontairement restreinte pour limiter les formats ex?cutables ou difficiles ? contr?ler.
    private const ALLOWED_MIME_TYPES = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/webp',
        'text/plain',
        'application/zip',
    ];

    #[OA\Post(
        path: '/api/items/{itemId}/attachments',
        summary: 'Ajoute une pi?ce jointe ? un ?l?ment.',
        security: [['Bearer' => []]],
        tags: ['Pi?ces jointes'],
        parameters: [
            new OA\Parameter(name: 'itemId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    required: ['file'],
                    properties: [
                        new OA\Property(property: 'file', type: 'string', format: 'binary'),
                    ],
                    type: 'object'
                )
            )
        )
    )]
    #[OA\Response(response: 201, description: 'Pi?ce jointe ajout?e.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'Acc?s interdit.')]
    #[OA\Response(response: 404, description: 'Ã‰l?ment introuvable.')]
    #[OA\Response(response: 422, description: 'Fichier invalide, trop volumineux ou non autoris?.')]
    #[Route('/items/{itemId}/attachments', name: 'create', methods: ['POST'], requirements: ['itemId' => '\\d+'])]
    public function create(
        int $itemId,
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        VaultItemRepository $vaultItemRepository,
        ItemAttachmentStorage $attachmentStorage,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $item = $vaultItemRepository->find($itemId);

        if ($item === null) {
            return $this->json(['message' => 'Ã‰l?ment introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if (!$this->isGranted(ItemVoter::MANAGE_ATTACHMENTS, $item)) {
            return $this->json(['message' => 'Acc?s interdit.'], Response::HTTP_FORBIDDEN);
        }

        $uploadedFile = $request->files->get('file');

        if (!$uploadedFile instanceof \Symfony\Component\HttpFoundation\File\UploadedFile) {
            return $this->json(['message' => 'Aucun fichier valide n?a ?t? envoy?.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($uploadedFile->getSize() > self::MAX_FILE_SIZE) {
            return $this->json(['message' => 'Le fichier d?passe la taille maximale autoris?e.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (!in_array($uploadedFile->getClientMimeType(), self::ALLOWED_MIME_TYPES, true)) {
            return $this->json(['message' => 'Le type de fichier envoy? n?est pas autoris?.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Le binaire est stock? via le service d?di? avant d?tre rattach? ? l??l?ment.
        $attachment = $attachmentStorage->store($uploadedFile);
        $item->addAttachment($attachment);
        $entityManager->persist($attachment);
        $entityManager->flush();

        return $this->json([
            'attachment' => [
                'id' => $attachment->getId(),
                'name' => $attachment->getOriginalName(),
                'mimeType' => $attachment->getMimeType(),
                'size' => $attachment->getSize(),
                'createdAt' => $attachment->getCreatedAt()->format(\DateTimeInterface::ATOM),
                'downloadUrl' => sprintf('/api/attachments/%d/download', $attachment->getId()),
            ],
        ], Response::HTTP_CREATED);
    }

    #[OA\Get(
        path: '/api/attachments/{attachmentId}/download',
        summary: 'T?l?charge une pi?ce jointe.',
        security: [['Bearer' => []]],
        tags: ['Pi?ces jointes'],
        parameters: [
            new OA\Parameter(name: 'attachmentId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ]
    )]
    #[OA\Response(response: 200, description: 'Contenu du fichier.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'Acc?s interdit.')]
    #[OA\Response(response: 404, description: 'Pi?ce jointe introuvable.')]
    #[Route('/attachments/{attachmentId}/download', name: 'download', methods: ['GET'], requirements: ['attachmentId' => '\\d+'])]
    public function download(
        int $attachmentId,
        #[CurrentUser] ?User $authenticatedUser,
        AttachmentRepository $attachmentRepository,
        ItemAttachmentStorage $attachmentStorage
    ): Response {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $attachment = $attachmentRepository->find($attachmentId);

        if (!$attachment instanceof Attachment) {
            return $this->json(['message' => 'Pi?ce jointe introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $item = $attachment->getItem();

        if ($item === null || !$this->isGranted(ItemVoter::VIEW, $item)) {
            return $this->json(['message' => 'Acc?s interdit.'], Response::HTTP_FORBIDDEN);
        }

        $path = $attachmentStorage->resolvePath($attachment);

        if (!is_file($path)) {
            return $this->json(['message' => 'Fichier introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $response = new BinaryFileResponse($path);
        $response->headers->set('Content-Type', $attachment->getMimeType() ?: 'application/octet-stream');
        $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, $attachment->getOriginalName());

        return $response;
    }

    #[OA\Delete(
        path: '/api/attachments/{attachmentId}',
        summary: 'Supprime une pi?ce jointe.',
        security: [['Bearer' => []]],
        tags: ['Pi?ces jointes'],
        parameters: [
            new OA\Parameter(name: 'attachmentId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ]
    )]
    #[OA\Response(response: 200, description: 'Pi?ce jointe supprim?e.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'Acc?s interdit.')]
    #[OA\Response(response: 404, description: 'Pi?ce jointe introuvable.')]
    #[Route('/attachments/{attachmentId}', name: 'delete', methods: ['DELETE'], requirements: ['attachmentId' => '\\d+'])]
    public function delete(
        int $attachmentId,
        #[CurrentUser] ?User $authenticatedUser,
        AttachmentRepository $attachmentRepository,
        ItemAttachmentStorage $attachmentStorage,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $attachment = $attachmentRepository->find($attachmentId);

        if (!$attachment instanceof Attachment) {
            return $this->json(['message' => 'Pi?ce jointe introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $item = $attachment->getItem();

        if ($item === null || !$this->isGranted(ItemVoter::MANAGE_ATTACHMENTS, $item)) {
            return $this->json(['message' => 'Acc?s interdit.'], Response::HTTP_FORBIDDEN);
        }

        $attachmentStorage->remove($attachment);
        $entityManager->remove($attachment);
        $entityManager->flush();

        return $this->json(['message' => 'La pi?ce jointe a bien ?t? supprim?e.']);
    }
}
