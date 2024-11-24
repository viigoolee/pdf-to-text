import { Hono } from "hono";
import { getDocumentProxy, extractText } from "unpdf";

const app = new Hono();

// Serve an HTML form for PDF URL input
app.get("/", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>PDF to Text Converter</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
          input[type="url"] { width: 100%; padding: 8px; margin: 8px 0; }
          button { padding: 8px 16px; background: #0070f3; color: white; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0051a2; }
        </style>
      </head>
      <body>
        <h1>PDF to Text Converter</h1>
        <p>Enter a PDF URL or add it directly in the path: <code>/pdf-url-here</code></p>
        <form action="/convert" method="GET">
          <input type="url" name="url" placeholder="https://example.com/document.pdf" required>
          <button type="submit">Convert</button>
        </form>
      </body>
    </html>
  `);
});

// Handle direct PDF URL in path
app.get("/*", async (c) => {
  try {
    const url = c.req.url.substring(c.req.url.indexOf('/', 8)); // Remove domain part
    if (!url || url === '/') {
      return c.redirect('/');
    }

    // Decode and clean the URL
    const pdfUrl = decodeURIComponent(url.substring(1)); // Remove leading slash
    if (!pdfUrl.toLowerCase().endsWith('.pdf')) {
      return c.text('URL must end with .pdf', 400);
    }

    // Fetch the PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      return c.text(`Failed to fetch PDF: ${response.statusText}`, 400);
    }

    const buffer = await response.arrayBuffer();
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });

    // Ensure textContent is a string
    const textContent = Array.isArray(result.text)
      ? result.text.join(" ")
      : result.text;

    return c.text(textContent);
  } catch (error) {
    return c.text(`Error processing PDF: ${error.message}`, 500);
  }
});

// Handle form submission
app.get("/convert", async (c) => {
  try {
    const url = c.req.query('url');
    if (!url) {
      return c.text('No URL provided', 400);
    }
    return c.redirect('/' + encodeURIComponent(url));
  } catch (error) {
    return c.text(`Error: ${error.message}`, 500);
  }
});

export default app;
