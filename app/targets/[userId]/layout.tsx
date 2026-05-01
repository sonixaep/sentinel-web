/* app/targets/[userId]/layout.tsx — Server Component wrapper */
import TargetLayoutClient from "./target-layout-client"

export function generateStaticParams() {
  return [{ userId: "_" }]
}

export default function TargetLayout({ children }: { children: React.ReactNode }) {
  return <TargetLayoutClient>{children}</TargetLayoutClient>
}
