<?php

namespace App\Controller\Documentation;

use Symfony\Component\HttpFoundation\Response;

final class ApiDocumentationController
{
    public function __invoke(): Response
    {
        // Swagger UI consomme le JSON OpenAPI g?n?r? par Nelmio pour permettre les tests interactifs.
        $html = <<<'HTML'
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Supwarden API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>
      body {
        margin: 0;
      }

      .swagger-ui .info .title,
      .swagger-ui .info a {
        color: #193247;
      }

      .swagger-ui .info .base-url,
      .swagger-ui .info p,
      .swagger-ui .renderedMarkdown p {
        color: #5d778b;
      }

      .swagger-ui .scheme-container {
        background: #f5f7f9;
        box-shadow: inset 0 -1px 0 #e2e8ee;
      }

      .swagger-ui .btn.authorize {
        border-color: #6f879a;
        color: #466072;
      }

      .swagger-ui .btn.execute {
        background: linear-gradient(180deg, #8fd3ff, #5fa8d3);
        border-color: #5fa8d3;
        color: #08111d;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/api/doc/openapi',
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true
      });
    </script>
  </body>
</html>
HTML;

        return new Response($html);
    }
}
