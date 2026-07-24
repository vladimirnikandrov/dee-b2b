const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export function LegalPage({ title, updated, children }) {
  return (
    <div style={{ background: "#000", color: "#ccc", minHeight: "100vh", fontFamily: FONT, padding: "64px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <a href="/" style={{ color: "#666", fontSize: 12, textDecoration: "none", letterSpacing: "0.06em" }}>← DEE</a>
        <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 600, marginTop: 24, marginBottom: 4 }}>{title}</h1>
        <p style={{ color: "#666", fontSize: 12, marginBottom: 36 }}>Effective date: {updated}</p>
        <div style={{ fontSize: 14, lineHeight: 1.8 }}>{children}</div>
      </div>
    </div>
  );
}

export function H2({ children }) {
  return <h2 style={{ color: "#fff", fontSize: 15, fontWeight: 600, marginTop: 32, marginBottom: 10 }}>{children}</h2>;
}

export function P({ children }) {
  return <p style={{ marginBottom: 14 }}>{children}</p>;
}

export function Ul({ children }) {
  return <ul style={{ marginBottom: 14, paddingLeft: 20 }}>{children}</ul>;
}
