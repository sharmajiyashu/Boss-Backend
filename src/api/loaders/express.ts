import { Express, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import AppLogger from './logger';
import routes from '../routes';
import { ZodError } from 'zod';
import { Language } from '../../constants/enum';
import Container from 'typedi';
import { CMSService } from '../../services/admin/CMSService';

interface CustomError extends Error {
  status?: number;
}

export default (app: Express): void => {
  app.use(helmet({
    contentSecurityPolicy: false, // Allow external fonts/styles for our public HTML pages
  }));
  app.use(compression());
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ limit: '5mb', extended: true }));

  app.head('/health', async (req: Request, res: Response) => {
    res.status(200).end();
  });

  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'OK',
      message: 'Service is healthy'
    });
  });

  app.get('/languages', (req: Request, res: Response) => {
    res.status(200).json({
      languages: Language
    });
  });

  // Root-level public CMS page rendering
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

  app.get('/about-us', (req, res) => renderPage('about-us', res));
  app.get('/terms-and-conditions', (req, res) => renderPage('terms-and-conditions', res));
  app.get('/privacy-policy', (req, res) => renderPage('privacy-policy', res));
  app.get('/contact-us', (req, res) => renderPage('contact-us', res));

  app.use((req: Request, _res: Response, next: NextFunction) => {
    AppLogger.info(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  app.use('/v1/api', routes());

  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: (error as ZodError).issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    const status = error.status || 500;
    const message = error.message || 'Internal server error';

    AppLogger.error(`[Global Error Handler] ${message}`, {
      stack: error.stack,
      path: _req.path,
      method: _req.method
    });

    res.status(status).json({
      success: false,
      error: message
    });
  });
};