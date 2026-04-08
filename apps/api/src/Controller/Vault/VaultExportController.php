<?php

declare(strict_types=1);

namespace App\Controller\Vault;

use App\Entity\User;
use App\Entity\Vault;
use App\Repository\VaultRepository;
use App\Security\Vault\VaultVoter;
use App\Service\VaultDataExportService;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/vaults', name: 'api_vaults_export_')]
final class VaultExportController extends AbstractController
{
    #[OA\Get(
        path: '/api/vaults/{id}/export',
        summary: 'Exporte un trousseau en JSON ou CSV.',
        security: [['Bearer' => []]],
        tags: ['Trousseaux'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'format', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['json', 'csv'])),
        ]
    )]
    #[Route('/{id}/export', name: 'single', methods: ['GET'], requirements: ['id' => '\\d+'])]
    public function __invoke(
        int $id,
        Request $request,
        #[CurrentUser] ?User $authenticatedUser,
        VaultRepository $vaultRepository,
        VaultDataExportService $vaultDataExportService,
        EntityManagerInterface $entityManager,
    ): Response {
        if (!$authenticatedUser instanceof User) {
            return $this->json(['message' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $vault = $vaultRepository->find($id);

        if (!$vault instanceof Vault) {
            return $this->json(['message' => 'Trousseau introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if (!$this->isGranted(VaultVoter::VIEW, $vault)) {
            return $this->json(['message' => 'Acces interdit.'], Response::HTTP_FORBIDDEN);
        }

        $format = strtolower(trim((string) $request->query->get('format', 'json')));

        if (method_exists($authenticatedUser, 'incrementExportCount')) {
            $authenticatedUser->incrementExportCount();
            $entityManager->flush();
        }

        $transliteratedName = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $vault->getName());
        $safeVaultName = trim((string) preg_replace('/[^a-zA-Z0-9_-]+/', '-', $transliteratedName ?: $vault->getName()), '-');
        if ($safeVaultName === '') {
            $safeVaultName = sprintf('trousseau-%d', $vault->getId());
        }

        $timestamp = (new \DateTimeImmutable())->format('Ymd-Hi');
        $fileBaseName = sprintf('Supwarden_%s_%s', $safeVaultName, $timestamp);

        if ($format === 'json') {
            return new JsonResponse(
                $vaultDataExportService->buildSingleVaultJsonExport($vault),
                Response::HTTP_OK,
                ['Content-Disposition' => sprintf('attachment; filename="%s.json"', $fileBaseName)]
            );
        }

        if ($format === 'csv') {
            return new Response(
                $vaultDataExportService->buildSingleVaultCsvExport($vault),
                Response::HTTP_OK,
                [
                    'Content-Type' => 'text/csv; charset=UTF-8',
                    'Content-Disposition' => sprintf('attachment; filename="%s.csv"', $fileBaseName),
                ]
            );
        }

        return $this->json(['message' => 'Format non supporte. Utilisez JSON ou CSV.'], Response::HTTP_UNPROCESSABLE_ENTITY);
    }
}
