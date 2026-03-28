<?php

use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__).'/vendor/autoload.php';

if (method_exists(Dotenv::class, 'bootEnv')) {
    (new Dotenv())->bootEnv(dirname(__DIR__).'/.env');
}

// Garde une base de test locale pour éviter une dépendance au conteneur PostgreSQL.
if (($_SERVER['APP_ENV'] ?? $_ENV['APP_ENV'] ?? null) === 'test') {
    $testDatabaseUrl = 'sqlite:///%kernel.project_dir%/var/test.db';
    $_SERVER['DATABASE_URL'] = $testDatabaseUrl;
    $_ENV['DATABASE_URL'] = $testDatabaseUrl;
    putenv(sprintf('DATABASE_URL=%s', $testDatabaseUrl));
}

if ($_SERVER['APP_DEBUG']) {
    umask(0000);
}
