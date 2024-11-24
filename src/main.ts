import { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

// Import PDF.js as a dynamic import
const pdfjsLib = await import('pdfjs-dist/build/pdf.js');

// Configure PDF.js for worker-less operation
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF to Text Converter</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            color: #2c3e50;
            text-align: center;
        }
        form {
            background: #f7f9fc;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        input[type="url"] {
            width: 100%;
            padding: 8px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        button {
            background: #3498db;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background: #2980b9;
        }
        .error {
            color: #e74c3c;
            background: #fde8e7;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
    </style>
</head>
<body>
    <h1>PDF to Text Converter</h1>
    <form action="/convert" method="POST">
        <label for="pdfUrl">Enter PDF URL:</label>
        <input type="url" id="pdfUrl" name="pdfUrl" required placeholder="https://example.com/document.pdf">
        <button type="submit">Convert to Text</button>
    </form>
    <p>
        <strong>Direct URL Usage:</strong> Add your PDF URL to the path: <code>/https://example.com/document.pdf</code>
    </p>
</body>
</html>
`;

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Serve home page
  if (path === "/" || path === "") {
    return new Response(HTML_TEMPLATE, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Handle form submission
  if (path === "/convert" && request.method === "POST") {
    const formData = await request.formData();
    const pdfUrl = formData.get("pdfUrl");
    
    if (!pdfUrl) {
      return new Response("PDF URL is required", { status: 400 });
    }

    return await convertPDF(pdfUrl.toString());
  }

  // Handle direct URL conversion
  if (path.length > 1) {
    const pdfUrl = path.slice(1); // Remove leading slash
    return await convertPDF(pdfUrl);
  }

  return new Response("Not Found", { status: 404 });
}

async function convertPDF(pdfUrl: string): Promise<Response> {
  try {
    // Validate URL
    const url = new URL(pdfUrl);
    if (!url.href.toLowerCase().endsWith('.pdf')) {
      return new Response('URL must point to a PDF file', { status: 400 });
    }

    // Fetch PDF
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      return new Response(`Failed to fetch PDF: ${pdfResponse.statusText}`, { status: 400 });
    }

    const pdfData = await pdfResponse.arrayBuffer();
    
    try {
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfData),
        isEvalSupported: false,
        disableFontFace: true,
        useSystemFonts: false,
        cMapUrl: undefined,
        standardFontDataUrl: undefined
      });

      const pdf = await loadingTask.promise;

      // Extract text from all pages
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      
      return new Response(text, {
        headers: { 'Content-Type': 'text/plain' }
      });
    } catch (pdfError) {
      return new Response(`Error processing PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`, { status: 500 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(`Error converting PDF: ${errorMessage}`, { status: 500 });
  }
}

export default {
  fetch: handleRequest,
};
