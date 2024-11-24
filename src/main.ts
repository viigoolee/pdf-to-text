import pdfParse from 'pdf-parse';

const htmlTemplate = (baseUrl: string) => `
<!DOCTYPE html>
<html>
  <head>
    <title>PDF to Text Converter</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      :root {
        --primary-color: #0070f3;
        --primary-hover: #0051a2;
        --bg-light: #f6f6f6;
        --code-bg: #e6e6e6;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        max-width: 800px;
        margin: 2rem auto;
        padding: 0 1rem;
        line-height: 1.6;
        color: #333;
      }
      h1 {
        text-align: center;
        color: var(--primary-color);
        margin-bottom: 2rem;
      }
      .container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        padding: 2rem;
      }
      .section {
        background: var(--bg-light);
        padding: 1.5rem;
        border-radius: 8px;
        margin: 1.5rem 0;
      }
      .method {
        border-left: 4px solid var(--primary-color);
        padding-left: 1rem;
        margin: 1rem 0;
      }
      input[type="url"] {
        width: 100%;
        padding: 12px;
        margin: 8px 0;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-size: 16px;
        transition: border-color 0.3s;
      }
      input[type="url"]:focus {
        border-color: var(--primary-color);
        outline: none;
      }
      button {
        width: 100%;
        padding: 12px;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        cursor: pointer;
        transition: background 0.3s;
      }
      button:hover {
        background: var(--primary-hover);
      }
      code {
        background: var(--code-bg);
        padding: 4px 8px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        word-break: break-all;
      }
      .example {
        background: white;
        border: 1px solid #ddd;
        padding: 1rem;
        border-radius: 6px;
        margin: 1rem 0;
      }
      .tips {
        list-style-type: none;
        padding: 0;
      }
      .tips li {
        padding: 8px 0;
        padding-left: 24px;
        position: relative;
      }
      .tips li:before {
        content: "💡";
        position: absolute;
        left: 0;
      }
      .error {
        color: #d32f2f;
        background: #ffebee;
        padding: 8px;
        border-radius: 4px;
        margin-top: 8px;
        display: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>PDF to Text Converter</h1>
      
      <div class="section">
        <h2>📝 How to Use</h2>
        
        <div class="method">
          <h3>Method 1: Direct URL</h3>
          <p>Simply add your PDF URL to our service URL:</p>
          <div class="example">
            <code>${baseUrl}https://example.com/sample.pdf</code>
          </div>
        </div>

        <div class="method">
          <h3>Method 2: Use the Form</h3>
          <p>Paste your PDF URL below and click Convert:</p>
          <form action="/convert" method="GET" id="convertForm">
            <input 
              type="url" 
              name="url" 
              placeholder="https://example.com/document.pdf"
              required
              pattern=".*\\.pdf$"
            >
            <div class="error" id="urlError">URL must end with .pdf</div>
            <button type="submit">Convert to Text</button>
          </form>
        </div>
      </div>

      <div class="section">
        <h2>ℹ️ Important Tips</h2>
        <ul class="tips">
          <li>Make sure your PDF URL ends with <code>.pdf</code></li>
          <li>The PDF must be publicly accessible</li>
          <li>Large PDFs may take a few moments to process</li>
          <li>Text extraction works best with searchable PDFs</li>
          <li>Scanned documents might not extract properly</li>
        </ul>
      </div>
    </div>

    <script>
      document.getElementById('convertForm').addEventListener('submit', function(e) {
        const input = this.querySelector('input[type="url"]');
        const error = document.getElementById('urlError');
        
        if (!input.value.toLowerCase().endsWith('.pdf')) {
          e.preventDefault();
          error.style.display = 'block';
          input.focus();
        } else {
          error.style.display = 'none';
        }
      });
    </script>
  </body>
</html>
`;

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Handle root path - show the form
      if (path === '/' || path === '') {
        return new Response(htmlTemplate(url.origin + '/'), {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      // Handle form submission
      if (path === '/convert') {
        const params = new URLSearchParams(url.search);
        const pdfUrl = params.get('url');
        if (!pdfUrl) {
          return new Response('No URL provided', { status: 400 });
        }
        return Response.redirect(url.origin + '/' + encodeURIComponent(pdfUrl));
      }

      // Handle PDF URL processing
      const pdfUrl = decodeURIComponent(path.substring(1));
      if (!pdfUrl.toLowerCase().endsWith('.pdf')) {
        return new Response('URL must end with .pdf', { status: 400 });
      }

      // Fetch and process PDF
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        return new Response(`Failed to fetch PDF: ${response.statusText}`, { status: 400 });
      }

      const buffer = await response.arrayBuffer();
      const data = await pdfParse(buffer);
      
      return new Response(data.text, {
        headers: { 'Content-Type': 'text/plain' }
      });

    } catch (error) {
      return new Response(`Error processing PDF: ${error.message}`, { status: 500 });
    }
  },
};
