import { useState } from "react";

const API = import.meta.env.VITE_API_URL;

function Field({ label, unit, value, onChange, type="number", step="any" }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ fontSize: 14, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type={type}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, padding: 10, fontSize: 16 }}
        />
        {unit ? (
          <div style={{ minWidth: 80, padding: 10, background: "#f3f3f3", textAlign: "center" }}>
            {unit}
          </div>
        ) : null}
      </div>
    </label>
  );
}

function ResultCard({ title, value, unit }) {
  return (
    <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 10 }}>
      <div style={{ fontSize: 13, opacity: 0.75 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>
        {value ?? "—"} <span style={{ fontSize: 14, fontWeight: 500 }}>{unit}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("register");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [organization, setOrganization] = useState("");
  const [phone, setPhone] = useState("");
  const [consentStorage, setConsentStorage] = useState(false);
  const [token, setToken] = useState("");
  const [vdot, setVdot] = useState("10000");
  const [page, setPage] = useState("home"); // "home" | "auth" | "app" | "impressum";

  
  const [strompreis, setStrompreis] = useState("0.30");
  const [waermepreis, setWaermepreis] = useState("0.22");
  const [zeit, setZeit] = useState("5");
  const [tage, setTage] = useState("300");
  const [out, setOut] = useState(null);
  const [history, setHistory] = useState([]);


// NICHTS zwischen } und async function register()!
// register() muss oberhalb dieses } stehen, also innerhalb von App()

  
async function login() {
  setAuthErr("");
  setAuthMsg("");

  if (!email.trim() || !pw.trim()) {
    setAuthErr("Bitte E-Mail und Passwort eingeben.");
    return;
  }
  if (!email.includes("@")) {
    setAuthErr("Bitte eine gültige E-Mail eingeben.");
    return;
  }

  try {
    setAuthBusy(true);

    const r = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password: pw }),
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      // Backend liefert "Login falsch"
      const msg =
        typeof j.detail === "string"
          ? j.detail
          : "Login fehlgeschlagen. Bitte prüfen.";
      setAuthErr(msg);
      return;
    }

    setToken(j.token);
    setPage("app");
    setPw("");         // Passwortfeld leeren
    setAuthMsg("");    // Meldungen leeren
    setAuthErr("");

    await loadHistory(); // falls du das schon so machst
  } catch (e) {
    setAuthErr("Netzwerkfehler/. Bitte später erneut versuchen.");
  } finally {
    setAuthBusy(false);
  }
}



async function register() {

  setAuthErr("");
  setAuthMsg("");

  // einfache Pflichtfeldprüfung
  if (
    !firstname.trim() ||
    !lastname.trim() ||
    !organization.trim() ||
    !phone.trim() ||
    !email.trim() ||
    !pw.trim()
  ) {
    setAuthErr("Bitte alle Felder ausfüllen.");
    return;
  }
  if (pw.trim().length < 6) {
    setAuthErr("Passwort muss mindestens 6 Zeichen haben.");
    return;
  }
  if (!email.includes("@")) {
    setAuthErr("Bitte eine gültige E-Mail eingeben.");
    return;
  }

  try {
    setAuthBusy(true);

    const payload = {
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      organization: organization.trim(),
      phone: phone.trim(),
      email: email.trim(),
      password: pw,
    };

    const r = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      const msg =
        typeof j.detail === "string"
          ? j.detail
          : j.detail
          ? "Bitte Eingaben prüfen."
          : "Registrierung fehlgeschlagen.";
      setAuthErr(msg);
      return;
    }
            

    setAuthMsg("Account erstellt ✅ Bitte jetzt einloggen.");
    setMode("login");
    setPw("");
  } catch (e) {
    setAuthErr("Netzwerkfehler. Bitte später erneut versuchen.");
  } finally {
    setAuthBusy(false);
  }
}





  async function calculateAndSave() {
    if (!consentStorage) {
      alert("Bitte stimme der Datenspeicherung (DSGVO) zu, um Berechnungen zu speichern.");
    return;
  }
    const payload = {
      vdot_m3h: Number(vdot),
      strompreis_eur_kwh: Number(strompreis),
      waermepreis_eur_kwh: Number(waermepreis),
      zeitreduktion_h_d: Number(zeit),
      betriebstage_d_a: Number(tage),
    };
    
    const r = await fetch(`${API}/calc`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) alert(j.detail || "Fehler");
    else {
      setOut(j);
      await loadHistory();
    }
  }

async function loadHistory() {
  const r = await fetch(`${API}/calc`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json().catch(() => []);
  if (r.ok) setHistory(j);
}


  
  async function downloadCSV() {
    const r = await fetch(`${API}/calc/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      alert("CSV-Export fehlgeschlagen");
      return;
    }
    const blob = await r.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "saveenergy_calcs.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function downloadPDF(calcId) {
    const r = await fetch(`${API}/calc/${calcId}/export/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      alert("PDF-Export fehlgeschlagen");
      return;
    }
    const blob = await r.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saveenergy_calc_${calcId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  }



// 1) Impressum IMMER zuerst
if (page === "impressum") {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: 900, margin: "30px auto", padding: 20 }}>
          <h2>Impressum</h2>

          <p style={{ opacity: 0.8 }}>
            Angaben gemäß § 5 ECG / § 25 MedienG (AT) sowie DSGVO-Informationen.
          </p>

          <h3>Betreiber</h3>
          <p>
            <strong>SaveEnergyTeam</strong><br />
            Rüdiger Külpmann, Achim Sell, Hans-Joachim Rau
          </p>

          <h3>Kontakt</h3>
          <p>
            E-Mail: <em>hajorau@me.com</em><br />
            Telefon: <em>+49171 6576101</em>
          </p>

          <h3>Haftungsausschluss</h3>
          <p style={{ lineHeight: 1.5 }}>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links.
            Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
          </p>

          <h3>Datenschutz (DSGVO)</h3>
          <p style={{ lineHeight: 1.5 }}>
            Diese Anwendung verarbeitet personenbezogene Daten (z. B. Name, Organisation, Rufnummer, E-Mail) zur Kontoerstellung
            und speichert Berechnungsdaten, wenn Sie der Speicherung zustimmen. Zweck: Bereitstellung der App-Funktion
            (Berechnung, Historie, Export).
          </p>

          <div style={{ marginTop: 18 }}>
            <button
              type="button"
              onClick={() => setPage(token ? "app" : "home")}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ccc", background: "#f3f3f3", cursor: "pointer" }}
            >
              Zurück
            </button>
          </div>
        </div>
      </div>

      <footer style={{ padding: "12px 0", textAlign: "center", fontSize: 12, color: "#666", borderTop: "1px solid #eee" }}>
        © SaveEnergyTeam: Rüdiger Külpmann, Achim Sell, Hans-Joachim Rau, Ideengeber Christoph Schaaf
      </footer>
    </div>
  );
}

// 2) Frontseite
if (page === "home") {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
          <h1 style={{ fontSize: 34, marginBottom: 10 }}>Berechnung der Energieeinsparung</h1>

         <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.85 }}>
  Auf Basis der nachgewiesenen hohen Einsparungen in der durchgeführten Studie der DTHG wurde die
  nachfolgende näherungsweise Berechnungsgrundlage erstellt. Sie zeigt Möglichkeiten zur Verbesserung der
  bedarfsgerechten Betriebsführung durch eine präzisere Anpassung des Anlagenbetriebs an die tatsächliche
  Nutzung der Räume.
</p>


          <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setPage("auth")}
              style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #ccc", background: "#f3f3f3", cursor: "pointer", fontWeight: 600 }}
            >
              Weiter / Login
            </button>

            <button
              type="button"
              onClick={() => setPage("impressum")}
              style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
            >
              Impressum / Datenschutz
            </button>
          </div>
        </div>
      </div>

      <footer style={{ padding: "12px 0", textAlign: "center", fontSize: 12, color: "#666", borderTop: "1px solid #eee" }}>
        © SaveEnergyTeam: Rüdiger Külpmann, Achim Sell, Hans-Joachim Rau, Idee Christoph Schaaf
      </footer>
    </div>
  );
}

// 3) Auth (Login/Registrierung) – wenn nicht eingeloggt
if (!token && page === "auth") {
  setPage("home");
  return null;
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
      }}
    >
      {/* Inhalt */}
      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: 520, margin: "60px auto", padding: 20 }}>
          <h1 style={{ marginBottom: 6 }}>
            {mode === "register" ? "Schritt 1: Account erstellen" : "Schritt 2: Einloggen"}
          </h1>

          <p style={{ marginTop: 0, opacity: 0.75 }}>
            {mode === "register"
              ? "Erstelle einmalig deinen Account. Danach kannst du dich jederzeit einloggen."
              : "Melde dich mit deiner E-Mail und deinem Passwort an."}
          </p>

          {/* Meldungsbox */}
          {authErr && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 8,
                background: "#ffe8e8",
                border: "1px solid #f5b5b5",
              }}
            >
              {authErr}
            </div>
          )}

          {authMsg && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 8,
                background: "#e8fff0",
                border: "1px solid #9be3b3",
              }}
            >
              {authMsg}
            </div>
          )}

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {mode === "register" && (
              <>
                <input
                  placeholder="Vorname"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                />
                <input
                  placeholder="Nachname"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                />
                <input
                  placeholder="Organisation"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                />
                <input
                  placeholder="Rufnummer"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                />
              </>
            )}

            <input
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
            />

            <input
              placeholder="Passwort"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
            />

            <button
              onClick={mode === "register" ? register : login}
              disabled={authBusy}
              style={{
                padding: 12,
                width: "100%",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#f2f2f2",
                opacity: authBusy ? 0.6 : 1,
                cursor: authBusy ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              {authBusy
                ? "Bitte warten…"
                : mode === "register"
                ? "Account erstellen"
                : "Einloggen"}
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === "register" ? "login" : "register")}
              style={{
                padding: 10,
                width: "100%",
                borderRadius: 10,
                border: "none",
                background: "transparent",
                color: "#0b57d0",
                cursor: "pointer",
              }}
            >
              {mode === "register"
                ? "Hast du schon ein Konto? → Einloggen"
                : "Noch kein Konto? → Account erstellen"}
            </button>
          </div>
        </div>
  

    </div>
  );
}




// 4) Eingeloggt -> App
// hier kommt dein Berechnungs-Return (der große Block)

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

    {/* Inhalt */}
    <div style={{ flex: 1 }}>
      <div style={{ maxWidth: 1100, margin: "20px auto", padding: 20 }}>
        <h2>SaveEnergy – Berechnung & Speicherung - SaveEnergyTeam</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Eingaben */}
          <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
            <h3>Eingaben</h3>

            <Field label="Volumenstrom Zu-/Abluft (V̇)" unit="m³/h" value={vdot} onChange={setVdot} />
            <Field label="Strompreis" unit="€/kWh" value={strompreis} onChange={setStrompreis} step="0.01" />
            <Field label="Wärmepreis" unit="€/kWh" value={waermepreis} onChange={setWaermepreis} step="0.01" />
            <Field label="Zeitreduktion pro Tag" unit="h/d" value={zeit} onChange={setZeit} step="0.1" />
            <Field label="Betriebstage pro Jahr" unit="d/a" value={tage} onChange={setTage} step="1" />

<div
  style={{
    marginTop: 10,
    padding: 10,
    border: "1px solid #eee",
    borderRadius: 10,
    background: "#fafafa",
  }}
>
  <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
    <input
      type="checkbox"
      checked={consentStorage}
      onChange={(e) => setConsentStorage(e.target.checked)}
      style={{ marginTop: 2 }}
    />
    <span style={{ fontSize: 13, lineHeight: 1.4 }}>
      Ich stimme zu, dass meine eingegebenen Daten und Berechnungsergebnisse zur Nutzung der App
      gespeichert werden (Historie/Export). Hinweis: Einwilligung gemäß DSGVO (Art. 6 Abs. 1 lit. a).
      Details siehe{" "}
      <button
        type="button"
        onClick={() => setPage("impressum")}
        style={{
          border: "none",
          background: "transparent",
          color: "#0b57d0",
          cursor: "pointer",
          padding: 0,
          textDecoration: "underline",
          fontSize: 13,
        }}
      >
        Impressum/Datenschutz
      </button>
      
    </span>
  </label>
</div>

            
           <button
              onClick={calculateAndSave}
              disabled={!consentStorage}
              style={{
              padding: 12,
              width: "100%",
              fontSize: 16,
              opacity: consentStorage ? 1 : 0.6,
              cursor: consentStorage ? "pointer" : "not-allowed",
          }}
          >
              Berechnen & Speichern
              </button>


            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Hinweis: Konstanten (WRG, SEP, Temperaturen, CO₂-Faktoren) werden intern verwendet und nicht angezeigt.
            </div>
          </div>

          {/* Ergebnisse */}
          <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
            <h3>Ergebnisse</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <ResultCard title="Einsparung Wärme" value={out?.waerme_kwh_a} unit="kWh/a" />
              <ResultCard title="Einsparung Strom" value={out?.strom_kwh_a} unit="kWh/a" />
              <ResultCard title="Kosteneinsparung" value={out?.euro_a} unit="€/a" />
              <ResultCard title="CO₂-Einsparung" value={out?.co2_t} unit="t CO₂e" />
            </div>

            <h3 style={{ marginTop: 18 }}>Meine gespeicherten Berechnungen</h3>

            <div
              style={{
                maxHeight: 280,
                maxWidth: "100%",
                overflowX: "auto",
                overflowY: "auto",
                border: "1px solid #eee",
                borderRadius: 10,
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 500,
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                }}
              >
            <thead>
  <tr style={{ background: "#fafafa" }}>
    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Datum</th>
    <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #eee" }}>€ / a</th>
    <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #eee" }}>t CO₂e</th>
    <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #eee" }}>PDF</th>
  </tr>
</thead>

<tbody>
  {history.map((h) => (
    <tr key={h.id}>
      <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>
        {new Date(h.created_at + "Z").toLocaleString()}
      </td>

      <td style={{ padding: 10, textAlign: "right", borderBottom: "1px solid #f3f3f3" }}>
        {h.outputs.euro_a}
      </td>

      <td style={{ padding: 10, textAlign: "right", borderBottom: "1px solid #f3f3f3" }}>
        {h.outputs.co2_t}
      </td>

      <td style={{ padding: 10, textAlign: "right", borderBottom: "1px solid #f3f3f3" }}>
        <button
          onClick={() => downloadPDF(h.id)}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: "#f9f9f9",
            cursor: "pointer",
          }}
        >
          PDF
        </button>
      </td>
    </tr>
  ))}

  {history.length === 0 && (
    <tr>
      <td colSpan="4" style={{ padding: 10, opacity: 0.7 }}>
        Noch keine Einträge.
      </td>
    </tr>
  )}
</tbody>

              </table>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-start",
                marginTop: 12,
              }}
            >
              <button
                onClick={downloadCSV}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  background: "#f3f3f3",
                  cursor: "pointer",
                }}
              >
                CSV Export
              </button>

         <button
  onClick={() => {
    setToken("");
    setOut(null);
    setHistory([]);
    setPage("home");
  }}
  style={{
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  }}
>
  Logout
</button>
               
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Footer */}
<footer
  style={{
    padding: "12px 0",
    textAlign: "center",
    fontSize: 12,
    color: "#666",
    borderTop: "1px solid #eee",
  }}
>
  <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
    <span>© SaveEnergyTeam: Rüdiger Külpmann, Achim Sell, Hans-Joachim Rau, Ideengeber Christof Schaaf</span>

    <button
      type="button"
      onClick={() => setPage("impressum")}
      style={{
        border: "none",
        background: "transparent",
        color: "#0b57d0",
        cursor: "pointer",
        padding: 0,
        textDecoration: "underline",
        fontSize: 12,
      }}
    >
      Impressum
    </button>
  </div>
</footer>

);

