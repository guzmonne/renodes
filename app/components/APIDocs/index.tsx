import { ReactNode } from "react"

import { ScrollArea } from "../ScrollArea"

export interface APIDocsProps {
  endpoint: string;
  statusCode: number;
  children: ReactNode;
}

export function APIDocs({ endpoint, statusCode, children }: APIDocsProps) {
  return (
    <>
      <h1>API Docs</h1>
      <APIDocs.Container>
        <APIDocs.Details>
          <APIDocs.Input label="Endpoint">{endpoint}</APIDocs.Input>
          <APIDocs.Input label="Status Code">{statusCode}</APIDocs.Input>
        </APIDocs.Details>
        <APIDocs.Input label="Content">
          {children}
        </APIDocs.Input>
      </APIDocs.Container>
    </>
  )
}

APIDocs.Container = ({ children }: { children: ReactNode }) => <div className="APIDocs__Container">{children}</div>
APIDocs.Details = ({ children }: { children: ReactNode }) => <div className="APIDocs__Details">{children}</div>

APIDocs.Input = ({ label, children }: { label: string, children: ReactNode }) => (
  <div className={`APIDocs__Input APIDocs__${label.replace(" ", "")}`}>
    <div className={`APIDocs__Input--label`}>{label}</div>
    <ScrollArea>
      <div className={`APIDocs__Input--content`}>{children}</div>
    </ScrollArea>
  </div>
)