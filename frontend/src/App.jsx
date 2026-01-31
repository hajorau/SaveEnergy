import React from 'react';

const HomePage = ({ setPage }) => {  // Props explizit als Parameter
  if (!setPage) {
    console.error('setPage function is required');
    return <div>Fehler: setPage Funktion fehlt</div>;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
          <h1 style={{ fontSize: 34, marginBottom: 10 }}>
            Berechnung der Energieeinsparung
          </h1>

          <p style={{ 
            fontSize: 16, 
            lineHeight: 1.6, 
            opacity: 0.85, 
            whiteSpace: "pre-line",
            marginBottom: 24  // Abstand hinzugefügt
          }}>
            Auf Basis der nachgewiesenen hohen Einsparungen wurde der nachfolgende Leitfaden erstellt.
            Er zeigt Möglichkeiten zur Verbesserung der bedarfsgerechten Betriebsführung durch eine präzisere Anpassung
            des Anlagenbetriebs an die tatsächliche Nutzung der Räume.

            Die vorgeschlagenen Maßnahmen sollen in kurzer Zeit den Energieverbrauch senken. Sie sollen weder den
            künstlerischen Betrieb noch die Behaglichkeit während des Aufenthaltes in den Räumen beeinträchtigen,
            sondern eher noch verbessern.
          </p>

          <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setPage("auth")}
              style={{
                padding: "12px 24px",  // Konsistente Padding-Größe
                borderRadius: 12,
                border: "1px solid #ccc",
                background: "#f3f3f3",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 16,  // Explizite Font-Size
                transition: "background-color 0.2s ease",  // Hover-Effekt
              }}
              onMouseEnter={(e) => e.target.style.background = "#e9e9e9"}
              onMouseLeave={(e) => e.target.style.background = "#f3f3f3"}
            >
              Weiter / Login
            </button>

            <button
              type="button"
              onClick={() => setPage("impressum")}
              style={{
                padding: "12px 24px",  // Konsistente Padding-Größe
                borderRadius: 12,
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
                fontSize: 16,  // Explizite Font-Size
                transition: "background-color 0.2s ease",
              }}
              onMouseEnter={(e) => e.target.style.background = "#f9f9f9"}
              onMouseLeave={(e) => e.target.style.background = "#fff"}
            >
              Impressum / Datenschutz
            </button>
          </div>
        </div>
      </div>

      <footer
        style={{
          padding: "24px 24px 12px",  // Konsistenter Padding
          textAlign: "center",
          fontSize: 12,
          color: "#666",
          borderTop: "1px solid #eee",
          marginTop: "auto"  // Footer bleibt unten
        }}
      >
        © SaveEnergyTeam: Rüdiger Külpmann, Achim Sell, Hans-Joachim Rau, Christoph Schaaf
      </footer>
    </div>
  );
};

export default HomePage;
