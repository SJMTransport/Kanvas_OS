export default function ContentDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-8">
      <h1 className="font-heading text-2xl font-bold text-text-primary">Detail Konten</h1>
      <p className="text-text-secondary mt-2">ID: {params.id}</p>
    </div>
  )
}
