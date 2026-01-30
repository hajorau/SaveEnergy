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
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [token, setToken] = useState("");

  const [vdot, setVdot] = useState("10000");
  const [strompreis, setStrompreis] = useState("0.30");
  const [waermepreis, setWaermepreis] = useState("0.22");
  const [zeit, setZeit] = useState("5");
  const [tage, setTage] = useState("300");

  const [out, setOut] = useState(null);
  const [history, setHistory] = useState([]);

  async function register() {
    const r = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pw }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) alert(j.detail || "Fehler");
    else { alert("Registriert. Bitte einloggen."); setMode("login"); }
  }

  async function login() {
    const r = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pw }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) alert(j.detail || "Fehler");
    else { setToken(j.token); await loadHistory(j.token); }
  }

  async function loadHistory(tk = token) {
    const r = await fetch(`${API}/calc`, { headers: { Authorization: `Bearer ${tk}` } });
    if (r.ok) setHistory(await r.json());
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
        <h2>{mode === "login" ? "Login" : "Registrieren"}</h2>
        <Field label="E-Mail" unit="" value={email} onChange={setEmail} type="email" />
        <Field label="Passwort" unit="" value={pw} onChange={setPw} type="password" />
        <button onClick={mode === "login" ? login : register} style={{ padding: 10, width: "100%" }}>
          {mode === "login" ? "Einloggen" : "Account erstellen"}
        </button>
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            style={{ border: "none", background: "none", color: "blue", cursor: "pointer" }}
          >
            {mode === "login" ? "Neu hier? Registrieren" : "Schon registriert? Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "70px auto", padding: 20 }}>
      <h2>SaveEnergy – Berechnung & Speicherung - Team SaveEnergy</h2>

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
