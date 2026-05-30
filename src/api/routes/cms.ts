import { Router, Response } from 'express';
import Container from 'typedi';
import { CMSService } from '../../services/admin/CMSService';

export default (router: Router) => {
  const cmsService = Container.get(CMSService);

  const renderPage = async (slug: string, res: Response) => {
    try {
      const page = await cmsService.getPageBySlug(slug);

      if (!page) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Page Not Found</title>
            <style>
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: #f8fafc;
                color: #64748b;
              }
              h1 { color: #b5651d; margin-bottom: 8px; }
            </style>
          </head>
          <body>
            <h1>Page Not Found</h1>
            <p>The requested page could not be found.</p>
          </body>
          </html>
        `);
      }

      // Return a beautiful, responsive HTML page with dynamic content
      return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${page.title}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            :root {
              --primary: #B5651D;
              --foreground: #1e293b;
              --background: #f8fafc;
              --card: #ffffff;
              --muted: #64748b;
            }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: var(--foreground);
              background-color: var(--background);
              margin: 0;
              padding: 0;
              line-height: 1.6;
            }
            .container {
              max-width: 800px;
              margin: 40px auto;
              padding: 40px;
              background-color: var(--card);
              border-radius: 24px;
              box-shadow: 0 10px 30px -10px rgba(0,0,0,0.04);
              border: 1px solid #f1f5f9;
            }
            h1 {
              font-size: 32px;
              font-weight: 800;
              margin-top: 0;
              margin-bottom: 24px;
              color: var(--primary);
              text-transform: capitalize;
            }
            .content {
              font-size: 15px;
              color: #334155;
            }
            .content p {
              margin-bottom: 20px;
            }
            .content h2 {
              font-size: 20px;
              font-weight: 700;
              margin-top: 32px;
              margin-bottom: 12px;
              color: #0f172a;
            }
            .content h3 {
              font-size: 16px;
              font-weight: 600;
              margin-top: 24px;
              margin-bottom: 8px;
              color: #0f172a;
            }
            .content ul, .content ol {
              margin-bottom: 20px;
              padding-left: 20px;
            }
            .content li {
              margin-bottom: 8px;
            }
            .content blockquote {
              border-left: 4px solid var(--primary);
              padding-left: 16px;
              margin: 20px 0;
              font-style: italic;
              color: var(--muted);
            }
            @media (max-width: 640px) {
              .container {
                margin: 20px 12px;
                padding: 24px;
                border-radius: 16px;
              }
              h1 {
                font-size: 24px;
                margin-bottom: 16px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${page.title}</h1>
            <div class="content">
              ${page.content}
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error: any) {
      return res.status(500).send('Internal Server Error');
    }
  };

  // Define clean endpoints directly under the router root
  router.get('/about-us', (req, res) => renderPage('about-us', res));
  router.get('/terms-and-conditions', (req, res) => renderPage('terms-and-conditions', res));
  router.get('/privacy-policy', (req, res) => renderPage('privacy-policy', res));
  router.get('/contact-us', (req, res) => renderPage('contact-us', res));
};
