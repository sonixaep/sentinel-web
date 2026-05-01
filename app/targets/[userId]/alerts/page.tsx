import PageClient from "./page-client"

export function generateStaticParams() {
  return [{ userId: "_" }]
}

export default function Page() {
  return <PageClient />
}
