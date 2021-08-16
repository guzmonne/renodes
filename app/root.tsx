import { Meta, Links, Scripts } from "remix";
import { Outlet } from "react-router-dom";

import { LiveReload } from "./components/Utils/LiveReload"

function Document({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1"></meta>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link href="https://unpkg.com/prismjs@1.24.1/themes/prism.css" rel="stylesheet" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
        <script src="https://kit.fontawesome.com/b9358ef67d.js" crossOrigin="anonymous"></script>
        <script src="https://unpkg.com/prismjs@1.24.1/components/prism-core.min.js"></script>
        <script src="https://unpkg.com/prismjs@1.24.1/plugins/autoloader/prism-autoloader.min.js"></script>
      </body>
    </html>
  );
}

export default function App() {
  return (
    <Document>
      <Outlet />
    </Document>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <Document>
      <h1>Uncaught Error</h1>
      <pre>{error.message}</pre>
    </Document>
  );
}
