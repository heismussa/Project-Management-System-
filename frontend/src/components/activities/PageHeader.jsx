function PageHeader({ title, actions }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1
        className="font-serif"
        style={{ fontSize: 26, fontWeight: 700, color: '#650018', margin: 0 }}
      >
        {title}
      </h1>
      <div className="flex flex-wrap items-center gap-3">{actions}</div>
    </div>
  )
}

export default PageHeader
