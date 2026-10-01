import type { ReactNode } from "react";

export function ChartCard({ title, eyebrow, children, className = "" }: { title: string; eyebrow?: string; children: ReactNode; className?: string }) {
  return (
    <article className={`panel chart-card ${className}`}>
      <div className="panel-heading">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h3>{title}</h3></div>
      <div className="chart-area">{children}</div>
    </article>
  );
}
