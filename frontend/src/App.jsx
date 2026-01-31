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


  
  const [token, setToken] = useState("");

  const [vdot, setVdot] = useState("10000");
  const [strompreis, setStrompreis] = useState("0.30");
  const [waermepreis, setWaermepreis] = useState("0.22");
  const [zeit, setZeit] = useState("5");
  const [tage, setTage] = useState("300");

  const [out, setOut] = useState(null);
  const [history, setHistory] = useState([]);

async function register() {
  setAuthErr("");
  setAuthMsg("");

  // einfache Pflichtfeldprüfung
  if (!firstname.trim() || !lastname.trim() || !organization.trim() || !phone.trim() || !email.trim() || !pw.trim()) {
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
      // Backend liefert z.B. {detail: "..."} oder 422 details
      const msg =
        typeof j.detail === "string"
          ? j.detail
          : j.detail
          ? "Bitte Eingaben prüfen."
          : "Registrierung fehlgeschlagen.";
      setAuthMsg("Account erstellt ✅ Bitte jetzt einloggen.");
setMode("login");
setPw("");

      return;
    }

    setAuthMsg("Account erstellt ✅ Bitte jetzt einloggen.");
    setMode("login"); // Schritt 2
    // E-Mail behalten, Passwort leeren
    setPw("");
  } catch (e) {
    setAuthErr("Netzwerkfehler. Bitte später erneut versuchen.");
  } finally {
    setAuthBusy(false);
  }
}


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


  async function calculateAndSave() {
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


  
if (!token) {
  return (
    <div style={{ maxWidth: 520, margin: "60px auto", padding: 20 }}>
      <h1 style={{ marginBottom: 6 }}>
        {mode === "register" ? "Schritt 1: Account erstellen" : "Schritt 2: Einloggen"}
      </h1>

      <p style={{ marginTop: 0, opacity: 0.75 }}>
        {mode === "register"
          ? "Erstelle einmalig deinen Account. Danach kannst du dich jederzeit einloggen."
          : "Melde dich mit deiner E-Mail und deinem Passwort an."}
      </p>

      {/* Schritt 4: Meldungsbox */}
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
        {/* Nur bei Registrierung: Extra-Felder */}
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

        {/* Schritt 5: Busy Button */}
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
          {authBusy ? "Bitte warten…" : mode === "register" ? "Account erstellen" : "Einloggen"}
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
  );
}


  return (
    <div style={{ maxWidth: 1100, margin: "20px auto", padding: 20 }}>
      <h2>SaveEnergy – Berechnung & Speicherung - SaveEnergyTeam</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          <h3>Eingaben</h3>
          <Field label="Volumenstrom Zu-/Abluft (V̇)" unit="m³/h" value={vdot} onChange={setVdot} />
          <Field label="Strompreis" unit="€/kWh" value={strompreis} onChange={setStrompreis} step="0.01" />
          <Field label="Wärmepreis" unit="€/kWh" value={waermepreis} onChange={setWaermepreis} step="0.01" />
          <Field label="Zeitreduktion pro Tag" unit="h/d" value={zeit} onChange={setZeit} step="0.1" />
          <Field label="Betriebstage pro Jahr" unit="d/a" value={tage} onChange={setTage} step="1" />

          <button onClick={calculateAndSave} style={{ padding: 12, width: "100%", fontSize: 16 }}>
            Berechnen & Speichern
          </button>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Hinweis: Konstanten (WRG, SEP, Temperaturen, CO₂-Faktoren) werden intern verwendet und nicht angezeigt.
          </div>
        </div>

        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          <h3>Ergebnisse</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <ResultCard title="Einsparung Wärme" value={out?.waerme_kwh_a} unit="kWh/a" />
            <ResultCard title="Einsparung Strom" value={out?.strom_kwh_a} unit="kWh/a" />
            <ResultCard title="Kosteneinsparung" value={out?.euro_a} unit="€/a" />
            <ResultCard title="CO₂-Einsparung" value={out?.co2_t} unit="t CO₂e" />
          </div>

          <h3 style={{ marginTop: 18 }}>Meine gespeicherten Berechnungen</h3>
          <div style={{ maxHeight: 280, overflow: "auto", border: "1px solid #eee", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
    <button onClick={() => downloadPDF(h.id)}
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
                  <tr><td colSpan="4" style={{ padding: 10, opacity: 0.7 }}>Noch keine Einträge.</td></tr>
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
  );
}
