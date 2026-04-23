<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Attachment;
use Symfony\Component\HttpFoundation\File\UploadedFile;

final class ItemAttachmentStorage
{
    public function __construct(
        private readonly string $targetDirectory
    ) {
    }

    public function store(UploadedFile $uploadedFile): Attachment
    {
        if (!is_dir($this->targetDirectory)) {
            mkdir($this->targetDirectory, 0775, true);
        }

        $fileSize = (int) $uploadedFile->getSize();
        $originalExtension = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_EXTENSION);
        $safeExtension = is_string($originalExtension) && $originalExtension !== '' ? strtolower($originalExtension) : 'bin';
        $storedName = sprintf('%s.%s', bin2hex(random_bytes(16)), $safeExtension);
        $uploadedFile->move($this->targetDirectory, $storedName);

        return (new Attachment())
            ->setOriginalName($uploadedFile->getClientOriginalName())
            ->setStoredName($storedName)
            ->setMimeType($uploadedFile->getClientMimeType() ?: 'application/octet-stream')
            ->setSize($fileSize);
    }

    public function resolvePath(Attachment $attachment): string
    {
        return $this->targetDirectory . DIRECTORY_SEPARATOR . $attachment->getStoredName();
    }

    public function remove(Attachment $attachment): void
    {
        $path = $this->resolvePath($attachment);

        if (is_file($path)) {
            unlink($path);
        }
    }
}

