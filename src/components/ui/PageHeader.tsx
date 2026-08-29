import type { ReactNode } from "react"

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="page-hero p-5 md:p-6">
      {/* items-center. Sempat dicoba items-start supaya kedua kolom berbagi
          tepi atas, tapi hasilnya tombol sejajar dengan eyebrow -- baris
          terkecil di blok kiri -- sehingga terbaca menggantung jauh di atas
          judulnya. Di tengah, tombol berada setinggi judul, dan itu yang
          dicari mata. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: "var(--brand-strong)" }}>
              {eyebrow}
            </p>
          )}
          <h2 className="text-[1.65rem] font-black leading-tight text-slate-950 md:text-[2rem]">
            {title}
          </h2>
          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="page-header-actions flex flex-wrap gap-2 lg:justify-end">
            {actions}
          </div>
        )}
      </div>
    </section>
  )
}
