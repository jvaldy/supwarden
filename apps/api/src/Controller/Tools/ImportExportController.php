<?php

declare(strict_types=1);

namespace App\Controller\Tools;

use App\Entity\User;
use App\Service\VaultDataExportService;
use App\Service\VaultDataImportService;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/tools', name: 'api_tools_data_')]
final class ImportExportController extends AbstractController
{
    #[OA\Post(
        path: '/api/tools/import',
        summary: 'Importe des donnees en JSON ou CSV.',
        security: [['Bearer' => []]],
        tags: ['Outils avances']
    )]
    #[Route('/import', name: 'import', methods: ['POST'])]
    public function import(
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        VaultDataImportService $vaultDataImportService,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $file = $request->files->get('file');

        if (!$file instanceof UploadedFile) {
            return $this->json(['message' => 'Aucun fichier valide envoye.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $format = strtolower(trim((string) $request->request->get('format', '')));
        if ($format === '') {
            $format = strtolower((string) $file->getClientOriginalExtension());
        }

        $content = file_get_contents($file->getRealPath());
        if (!is_string($content) || trim($content) === '') {
            return $this->json(['message' => 'Le fichier est vide.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($format === 'json') {
            $report = $vaultDataImportService->importFromJson($authenticatedUser, $content);

            if (method_exists($authenticatedUser, 'incrementImportCount')) {
                $authenticatedUser->incrementImportCount();
                $entityManager->flush();
            }

            return $this->json(['report' => $report]);
        }

        if ($format === 'csv') {
            $report = $vaultDataImportService->importFromCsv($authenticatedUser, $content);

            if (method_exists($authenticatedUser, 'incrementImportCount')) {
                $authenticatedUser->incrementImportCount();
                $entityManager->flush();
            }

            return $this->json(['report' => $report]);
        }

        return $this->json(['message' => 'Format non supporte. Utilisez JSON ou CSV.'], Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    #[OA\Get(
        path: '/api/tools/export',
        summary: 'Exporte les donnees en JSON ou CSV.',
        security: [['Bearer' => []]],
        tags: ['Outils avances']
    )]
    #[Route('/export', name: 'export', methods: ['GET'])]
    public function export(
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        VaultDataExportService $vaultDataExportService,
        EntityManagerInterface $entityManager,
    ): Response {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $format = strtolower(trim((string) $request->query->get('format', 'json')));

        if ($format === 'json') {
            $payload = $vaultDataExportService->buildJsonExport($authenticatedUser);

            if (method_exists($authenticatedUser, 'incrementExportCount')) {
                $authenticatedUser->incrementExportCount();
                $entityManager->flush();
            }

            return new JsonResponse($payload, Response::HTTP_OK, [
                'Content-Disposition' => 'attachment; filename="supwarden-export.json"',
            ]);
        }

        if ($format === 'csv') {
            $csvContent = $vaultDataExportService->buildCsvExport($authenticatedUser);

            if (method_exists($authenticatedUser, 'incrementExportCount')) {
                $authenticatedUser->incrementExportCount();
                $entityManager->flush();
            }

            return new Response($csvContent, Response::HTTP_OK, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="supwarden-export.csv"',
            ]);
        }

        return $this->json(['message' => 'Format non supporte. Utilisez JSON ou CSV.'], Response::HTTP_UNPROCESSABLE_ENTITY);
    }
}
