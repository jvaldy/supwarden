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

    // Liste volontairement restreinte pour limiter les formats executables ou difficiles a controler.
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
        summary: 'Ajoute une piece jointe a un element.',
        security: [['Bearer' => []]],
        tags: ['Pieces jointes'],
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
    #[OA\Response(response: 201, description: 'Piece jointe ajoutee.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'Acces interdit.')]
    #[OA\Response(response: 404, description: 'Element introuvable.')]
    #[OA\Response(response: 422, description: 'Fichier invalide, trop volumineux ou non autorise.')]
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
            return $this->json(['message' => 'Element introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if (!$this->isGranted(ItemVoter::MANAGE_ATTACHMENTS, $item)) {
            return $this->json(['message' => 'Acces interdit.'], Response::HTTP_FORBIDDEN);
        }

        $uploadedFile = $request->files->get('file');

        if (!$uploadedFile instanceof \Symfony\Component\HttpFoundation\File\UploadedFile) {
            return $this->json(['message' => 'Aucun fichier valide na ete envoye.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($uploadedFile->getSize() > self::MAX_FILE_SIZE) {
            return $this->json(['message' => 'Le fichier depasse la taille maximale autorisee.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (!in_array($uploadedFile->getClientMimeType(), self::ALLOWED_MIME_TYPES, true)) {
            return $this->json(['message' => 'Le type de fichier envoye nest pas autorise.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Le binaire est stocke via le service dedie avant detre rattache a lelement.
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
                'previewUrl' => sprintf('/api/attachments/%d/preview', $attachment->getId()),
            ],
        ], Response::HTTP_CREATED);
    }

    #[OA\Get(
        path: '/api/attachments/{attachmentId}/download',
        summary: 'Telecharge une piece jointe.',
        security: [['Bearer' => []]],
        tags: ['Pieces jointes'],
        parameters: [
            new OA\Parameter(name: 'attachmentId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ]
    )]
    #[OA\Response(response: 200, description: 'Contenu du fichier.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'Acces interdit.')]
    #[OA\Response(response: 404, description: 'Piece jointe introuvable.')]
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
            return $this->json(['message' => 'Piece jointe introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $item = $attachment->getItem();

        if ($item === null || !$this->isGranted(ItemVoter::VIEW, $item)) {
            return $this->json(['message' => 'Acces interdit.'], Response::HTTP_FORBIDDEN);
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

    #[OA\Get(
        path: '/api/attachments/{attachmentId}/preview',
        summary: 'Consulte une piece jointe (image ou PDF).',
        security: [['Bearer' => []]],
        tags: ['Pieces jointes'],
        parameters: [
            new OA\Parameter(name: 'attachmentId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ]
    )]
    #[OA\Response(response: 200, description: 'Apercu du fichier.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'Acces interdit.')]
    #[OA\Response(response: 404, description: 'Piece jointe introuvable.')]
    #[OA\Response(response: 422, description: 'Type de fichier non consultable.')]
    #[Route('/attachments/{attachmentId}/preview', name: 'preview', methods: ['GET'], requirements: ['attachmentId' => '\\d+'])]
    public function preview(
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
            return $this->json(['message' => 'Piece jointe introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $item = $attachment->getItem();

        if ($item === null || !$this->isGranted(ItemVoter::VIEW, $item)) {
            return $this->json(['message' => 'Acces interdit.'], Response::HTTP_FORBIDDEN);
        }

        $mimeType = $attachment->getMimeType() ?? '';
        $isPreviewable = str_starts_with($mimeType, 'image/') || $mimeType === 'application/pdf';

        if (!$isPreviewable) {
            return $this->json(['message' => 'Ce type de piece jointe nest pas consultable en apercu.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $path = $attachmentStorage->resolvePath($attachment);

        if (!is_file($path)) {
            return $this->json(['message' => 'Fichier introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $response = new BinaryFileResponse($path);
        $response->headers->set('Content-Type', $mimeType);
        $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_INLINE, $attachment->getOriginalName());

        return $response;
    }

    #[OA\Delete(
        path: '/api/attachments/{attachmentId}',
        summary: 'Supprime une piece jointe.',
        security: [['Bearer' => []]],
        tags: ['Pieces jointes'],
        parameters: [
            new OA\Parameter(name: 'attachmentId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ]
    )]
    #[OA\Response(response: 200, description: 'Piece jointe supprimee.')]
    #[OA\Response(response: 401, description: 'Authentification requise.')]
    #[OA\Response(response: 403, description: 'Acces interdit.')]
    #[OA\Response(response: 404, description: 'Piece jointe introuvable.')]
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
            return $this->json(['message' => 'Piece jointe introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $item = $attachment->getItem();

        if ($item === null || !$this->isGranted(ItemVoter::MANAGE_ATTACHMENTS, $item)) {
            return $this->json(['message' => 'Acces interdit.'], Response::HTTP_FORBIDDEN);
        }

        $attachmentStorage->remove($attachment);
        $entityManager->remove($attachment);
        $entityManager->flush();

        return $this->json(['message' => 'La piece jointe a bien ete supprimee.']);
    }
}
