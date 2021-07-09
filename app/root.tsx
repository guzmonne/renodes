import { Meta, Links, Scripts } from "remix";
import { Outlet } from "react-router-dom";

import { LiveReload } from "./components/utils/LiveReload"

function Document({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1"></meta>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
        <script src="https://kit.fontawesome.com/488f974bd7.js" crossOrigin="anonymous"></script>
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
