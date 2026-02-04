import { useState } from "react";
import Brand from "./components/Brand";


const API = import.meta.env.VITE_API_URL;

function Field({ label, unit, value, onChange, type = "number", step = "any" }) {
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
          <div
            style={{
              minWidth: 80,
              padding: 10,
              background: "#f3f3f3",
              textAlign: "center",
              borderRadius: 8,
              border: "1px solid #e6e6e6",
            }}
          >
            {unit}
          </div>
        ) : null}
      </div>
    </label>
  );
}

const fmtIntDE = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const fmt1DE = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatNumber(value, { decimals = 0 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return decimals === 1 ? fmt1DE.format(n) : fmtIntDE.format(n);
}

function ResultCard({ title, value, unit, decimals = 0 }) {
  return (
    <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 10 }}>
      <div style={{ fontSize: 13, opacity: 0.75 }}>{title}</div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1 }}>
          {formatNumber(value, { decimals })}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.8 }}>{unit}</div>
      </div>
    </div>
  );
}

function WaitBadge() {
  return (
    <div
      style={{
        marginTop: 12,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #f2c94c",
        background: "linear-gradient(180deg, #fff6cc, #fff1b1)",
        color: "#6a4b00",
        fontWeight: 700,
        lineHeight: 1.35,
      }}
    >
      ⚠️ <span style={{ textTransform: "uppercase" }}>Achtung</span>: Der Vorgang kann <b>ungewöhnlich lange</b> dauern.
      <br />
      Bitte die Seite <b>nicht schließen</b> und kurz warten.
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
  const [page, setPage] = useState("home"); // "home" | "auth-start" | "auth" | "app" | "impressum";

  const [raumAnlage, setRaumAnlage] = useState("");
  const [wrgVorhanden, setWrgVorhanden] = useState(false);

  const [strompreis, setStrompreis] = useState("0.30");
  const [waermepreis, setWaermepreis] = useState("0.22");
  const [zeit, setZeit] = useState("5");
  const [tage, setTage] = useState("300");
  const [out, setOut] = useState(null);
  const [history, setHistory] = useState([]);

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
        const msg = typeof j.detail === "string" ? j.detail : "Login fehlgeschlagen. Bitte prüfen.";
        setAuthErr(msg);
        return;
      }

      setToken(j.token);
      setPage("app");
      setPw("");
      setAuthMsg("");
      setAuthErr("");

      await loadHistory(j.token);
    } catch (e) {
      setAuthErr("Netzwerkfehler. Bitte später erneut versuchen.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function register() {
    setAuthErr("");
    setAuthMsg("");

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
      raum_anlage: raumAnlage.trim(),
      wrg_vorhanden: wrgVorhanden,
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

  async function loadHistory(t = token) {
    const r = await fetch(`${API}/calc`, {
      headers: { Authorization: `Bearer ${t}` },
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

  // ===========================
  // ROUTING
  // ===========================

  // 1) Impressum / DSGVO
  if (page === "impressum") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ maxWidth: 900, margin: "30px auto", padding: 20 }}>
            <h2>Impressum</h2>

            <h3>Angaben gemäß § 5 TMG</h3>

            <p>
              <strong>SaveEnergyTeam</strong>
              <br />
              Am Lohbachhang 13
              <br />
              44269 Dortmund
              <br />
              Deutschland
            </p>

            <p>
              <strong>Vertreten durch / Verantwortlich:</strong>
              <br />
              Hans-Joachim Rau
              <br />
              Rüdiger Külpmann
              <br />
              Achim Sell
            </p>

            <p>
              <strong>Kontakt:</strong>
              <br />
              Telefon: 0171 6576101
              <br />
              E-Mail: hajo@me.com
            </p>

            <p>
              <strong>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:</strong>
              <br />
              Hans-Joachim Rau · Rüdiger Külpmann · Achim Sell
              <br />
              Am Lohbachhang 13, 44269 Dortmund
            </p>

            <h3>Haftung für Inhalte</h3>
            <p style={{ lineHeight: 1.6 }}>
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte nach den allgemeinen Gesetzen
              verantwortlich. Nach §§ 8 bis 10 TMG sind wir jedoch nicht verpflichtet, übermittelte oder gespeicherte
              fremde Informationen zu überwachen.
            </p>

            <h3>Haftung für Links</h3>
            <p style={{ lineHeight: 1.6 }}>
              Diese Anwendung enthält ggf. Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss
              haben. Für diese fremden Inhalte übernehmen wir keine Gewähr.
            </p>

            <h3>Urheberrecht / Nutzungsbedingungen</h3>
          <p style={{ lineHeight: 1.6 }}>
            Die durch die Betreiber erstellten Inhalte, Texte, Grafiken, Berechnungsmodelle,
            Softwarebestandteile und Auswertungen dieser Anwendung unterliegen dem
            deutschen und europäischen Urheberrecht. Jede Verwertung außerhalb der Grenzen des Urheberrechts
            bedarf der vorherigen schriftlichen Zustimmung der Verantwortlichen.
          </p>
          <p style={{ lineHeight: 1.6 }}>
           Jede Vervielfältigung, Verbreitung, öffentliche Wiedergabe, Weitergabe an Dritte,
            Speicherung, Bearbeitung oder sonstige Verwendung – auch auszugsweise –
            ist ohne vorherige schriftliche Zustimmung des SaveEnergyTeam untersagt.
          </p>
           <p style={{ lineHeight: 1.6 }}>
              Dies gilt insbesondere für die Nutzung zu kommerziellen Zwecken,
              für Beratungsleistungen, für Schulungen sowie für externe Veröffentlichungen.
          </p>
            <p style={{ lineHeight: 1.6 }}>
            Wir bitten darum, beim Setzen von Links auf diese Website keine Inhalte in Frames einzubinden
            und die Quelle eindeutig kenntlich zu machen.
          </p>

            <h3>Hinweis zu Beratung und Gutachten</h3>

            <p style={{ lineHeight: 1.6 }}>
              Die durch dieses Tool erzeugten Berechnungen, Auswertungen und Empfehlungen
              dienen ausschließlich als unverbindliche Orientierungshilfe.
            </p>

            <p style={{ lineHeight: 1.6 }}>
              Eine Weitergabe, kommerzielle Nutzung oder Verwendung im Rahmen externer
              Beratungsleistungen ist ohne schriftliche Genehmigung nicht gestattet.
            </p>


            <hr style={{ margin: "30px 0" }} />

            <h2>Datenschutzerklärung (DSGVO)</h2>

            <h3>1. Verantwortlicher</h3>
            <p>
              SaveEnergyTeam, Am Lohbachhang 13, 44269 Dortmund, Deutschland
              <br />
              E-Mail: hajo@me.com · Telefon: 0171 6576101
            </p>

            <h3>2. Erhebung und Verarbeitung personenbezogener Daten</h3>
            <p>
              <strong>a) Bei der Registrierung:</strong> Vorname, Nachname, Organisation, Rufnummer, E-Mail, Passwort
              (verschlüsselt).
            </p>
            <p>
              <strong>b) Bei der Nutzung:</strong> Eingabedaten zur Berechnung (z. B. Raum/Anlage, WRG), Ergebnisse und
              Zeitstempel – Speicherung nur nach Einwilligung.
            </p>

            <h3>3. Zweck</h3>
            <ul>
              <li>Bereitstellung der Berechnungsfunktion</li>
              <li>Speicherung der Historie</li>
              <li>PDF- und CSV-Export</li>
              <li>Nutzerverwaltung / technischer Betrieb</li>
            </ul>

            <h3>4. Rechtsgrundlagen</h3>
            <p>Art. 6 Abs. 1 lit. a (Einwilligung), b (Vertrag), f (berechtigtes Interesse).</p>

            <h3>5. Speicherung und Löschung</h3>
            <p>Daten werden nur solange gespeichert, wie dies für den Zweck erforderlich ist. Nutzer können Löschung verlangen.</p>

            <h3>6. Weitergabe</h3>
            <p>Keine Weitergabe, außer gesetzliche Pflicht oder Hosting/Dienstleister für technischen Betrieb.</p>

            <h3>7. Datensicherheit</h3>
            <p>Technische und organisatorische Maßnahmen; Passwörter werden verschlüsselt gespeichert.</p>

            <div style={{ marginTop: 25 }}>
              <button
                type="button"
                onClick={() => setPage(token ? "app" : "home")}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #ccc",
                  background: "#f3f3f3",
                  cursor: "pointer",
                }}
              >
                Zurück
              </button>
            </div>
          </div>
        </div>

        <footer style={{ padding: "12px 0", textAlign: "center", fontSize: 12, color: "#666", borderTop: "1px solid #eee" }}>
          SaveEnergyTool™ ist eine Bezeichnung des SaveEnergyTeam. Alle Rechte vorbehalten.
        </footer>
      </div>
    );
  }

  // 2) Home (Startseite)  ✅ HIER ist dein neuer Text eingebaut
  if (page === "home") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
            <Brand size={42} showTeam centered />



            {/* Neuer Contentblock */}
            <div
              style={{
                marginTop: 8,
                padding: 18,
                border: "1px solid #eee",
                borderRadius: 16,
                background: "linear-gradient(180deg, #ffffff, #fafafa)",
              }}
            >
              <h1 style={{ fontSize: 34, margin: 0, marginBottom: 8 }}>Energieeffizienz im Theaterbetrieb</h1>

              <div style={{ fontSize: 16, lineHeight: 1.7, opacity: 0.9 }}>
               
                <h3 style={{ marginBottom: 6 }}>Wissenschaftliche Grundlage</h3>
                  <p style={{ marginTop: 0 }}>
                    Am 8. Oktober 2025 wurde auf dem Symposium DTHG-Energie in Leipzig
                    der DTHG-Leitfaden „Energieeﬃzienz im Theaterbetrieb“ vorgestellt.
                    Auf Initative anläßlich einer Jahrestagung der Technischen Direktoren ist das vorliegende Berechnungs-Tool entstanden.
                  </p>
                 <p style={{ marginTop: 0 }}>
                  <b>Wollen Sie wissen:</b>
                </p>
                <ul style={{ marginTop: 6, marginBottom: 14, paddingLeft: 18 }}>
                  <li>ob sich die Beschäftigung mit dem Thema für Ihr Haus lohnt?</li>
                  <li>wie hoch in Ihrem Haus das mögliche jährliche finanzielle Einsparpotenzial für Ihre RLT-Anlage ist?</li>
                </ul>
                <p style={{ marginTop: 0 }}>
                  Dann kann Ihnen das <b>SafeEnergyTool™</b> erste Hinweise geben.
                </p>

                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid #e8e8e8",
                    background: "#fff",
                  }}
                >
                  <h3 style={{ margin: 0, marginBottom: 6 }}>Ihr Einsparpotenzial auf einen Blick</h3>
                  <p style={{ margin: 0 }}>
                    Das Berechnungstool des <b>SaveEnergyTeams</b> ermittelt für Sie das mögliche Einsparpotenzial Ihrer
                    eigenen RLT-Anlage in Euro.
                  </p>

                  <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                    <div>✅ ohne Investitionen in die Anlagentechnik</div>
                    <div>✅ ohne Verzicht auf Behaglichkeitskomfort</div>
                    <div>✅ ausschließlich durch Anpassen der Anlagenlaufzeit an den echten Bedarf</div>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <h3 style={{ marginBottom: 6 }}>Wissenschaftliche Grundlage</h3>
                  <p style={{ marginTop: 0 }}>
                    Grundlagen für die Berechnungen sind die Erkenntnisse aus der vom BKM geförderten Energiestudie.
                    Im Rahmen der <b>DTHG-Energie-Studie (2024/2025)</b> wurde der Leitfaden{" "}
                    <b>„Energieeffizienz im Theaterbetrieb“</b> erstellt. Es wurde festgestellt, dass die Betriebszeiten der Anlagen in den untersuchten Räumen immer länger waren, als es notwendig ist. 
                    Eine Laufzeitreduktion führt zur Kosteneinsparung. Die Annahmen im Anhang zu Kapitel 4
                    („Ermittlung einer typischen Kostenreduktion“) werden in diesem Berechnungstool zugrunde gelegt. Danke an Christof Schaaf. Von ihm stammt die Anregung, die Berechnung allgemein zugänglich zu
                    machen.
                  </p>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => alert("https://dthgev.de/wp-content/uploads/2025/10/DTHG_Energie_Leitfaden.pdf")}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid #ddd",
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Leitfaden herunterladen (Download)
                  </button>

                  <button
                    type="button"
                    onClick={() => alert("hajorau@me.com")}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid #ddd",
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Fragen? Kontakt
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setPage("auth");
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid #ccc",
                  background: "#f3f3f3",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Ich habe einen Account → Einloggen
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setPage("auth");
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid #ccc",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Ich habe keinen Account → Registrieren
              </button>

              <button
                type="button"
                onClick={() => setPage("impressum")}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid #ccc",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Impressum / Datenschutz
              </button>
            </div>
          </div>
        </div>

        <footer style={{ padding: "12px 0", textAlign: "center", fontSize: 12, color: "#666", borderTop: "1px solid #eee" }}>
          SaveEnergyTool™ ist eine Bezeichnung des SaveEnergyTeam. Alle Rechte vorbehalten.
        </footer>
      </div>
    );
  }

// 3) Auth (Login/Registrierung)
if (!token && page === "auth") {
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
      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: 520, margin: "60px auto", padding: 20 }}>
          <h1 style={{ marginBottom: 6 }}>
            {mode === "register" ? "1.Schritt : Account erstellen" : "2.Schritt : Einloggen"}
          </h1>

          {/* Erklärung */}
          <p style={{ marginTop: 0, opacity: 0.8, lineHeight: 1.5 }}>
            {mode === "register"
              ? "Erstelle einmalig deinen Account. Danach kannst du dich jederzeit einloggen."
              : "Melde dich mit deiner E-Mail und deinem Passwort an."}
          </p>

          {/* Warnbox */}
          <div
            style={{
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 10,
              background: "#fff3cd",
              border: "1px solid #ffe69c",
              color: "#664d03",
              fontSize: 14,
              lineHeight: 1.4,
              fontWeight: 700,
            }}
          >
            ⚠️ ACHTUNG: Das kann sehr lange dauern (teilweise mehrere Minuten).  
            Bitte nicht abbrechen – Geduld haben.
          </div>

          {/* Bitte warten Badge */}
          {authBusy && (
            <div
              style={{
                marginTop: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 20,
                background: "#e8f0fe",
                color: "#174ea6",
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid #c6dafc",
              }}
            >
              ⏳ Bitte warten… Anfrage läuft
            </div>
          )}

          {/* Fehler */}
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

          {/* Erfolg */}
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
                background: authBusy ? "#eee" : "#f2f2f2",
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
              onClick={() => setPage("home")}
              disabled={authBusy}
              style={{
                padding: 12,
                width: "100%",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: authBusy ? "not-allowed" : "pointer",
                opacity: authBusy ? 0.6 : 1,
              }}
            >
              Zurück
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


  // 4) Nicht eingeloggt → zurück zu Home
  if (!token) {
    setPage("home");
    return null;
  }

  // 5) App (eingeloggt)
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "20px auto", padding: 20 }}>
          <h2>SaveEnergyTool – Berechnung & Speicherung - SaveEnergyTeam</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
            <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
              <h3>Eingaben</h3>

              <Field label="Raum/Anlage" value={raumAnlage} onChange={setRaumAnlage} type="text" />

              <div
                style={{
                  marginTop: 10,
                  marginBottom: 12,
                  padding: 10,
                  border: "1px solid #eee",
                  borderRadius: 10,
                  background: "#fafafa",
                }}
              >
                <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={wrgVorhanden} onChange={(e) => setWrgVorhanden(e.target.checked)} />
                  <span style={{ fontSize: 14 }}>Wärmerückgewinnung vorhanden</span>
                </label>
              </div>

              <Field label="Volumenstrom Zu-/Abluft (V̇)" unit="m³/h" value={vdot} onChange={setVdot} />
              <Field label="Strompreis" unit="€/kWh" value={strompreis} onChange={setStrompreis} step="0.01" />
              <Field label="Wärmepreis" unit="€/kWh" value={waermepreis} onChange={setWaermepreis} step="0.01" />
              <Field label="Laufzeitreduktion in Stunden pro Tag" unit="h/d" value={zeit} onChange={setZeit} step="0.1" />
              <Field label="Betriebstage pro Jahr" unit="d/a" value={tage} onChange={setTage} step="1" />

              <div style={{ marginTop: 10, padding: 10, border: "1px solid #eee", borderRadius: 10, background: "#fafafa" }}>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={consentStorage}
                    onChange={(e) => setConsentStorage(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span style={{ fontSize: 13, lineHeight: 1.4 }}>
                    Ich stimme zu, dass meine eingegebenen Daten und Berechnungsergebnisse zur Nutzung der App gespeichert werden
                    (Historie/Export). Hinweis: Einwilligung gemäß DSGVO (Art. 6 Abs. 1 lit. a). Details siehe{" "}
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
                  marginTop: 12,
                  padding: 12,
                  width: "100%",
                  fontSize: 16,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: "#f2f2f2",
                  opacity: consentStorage ? 1 : 0.6,
                  cursor: consentStorage ? "pointer" : "not-allowed",
                  fontWeight: 800,
                }}
              >
                Berechnen & Speichern
              </button>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                Hinweis: Konstanten (WRG, SEP, Temperaturen, CO₂-Faktoren) werden intern verwendet und nicht angezeigt.
              </div>
            </div>

            <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
              <h3>Ergebnisse</h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <ResultCard title="Einsparung Wärme" value={out?.waerme_kwh_a} unit="kWh/a" decimals={0} />
                <ResultCard title="Einsparung Strom" value={out?.strom_kwh_a} unit="kWh/a" decimals={0} />
                <ResultCard title="Kosteneinsparung" value={out?.euro_a} unit="€/a" decimals={0} />
                <ResultCard title="CO2-Einsparung" value={out?.co2_t} unit="t CO2e" decimals={1} />
              </div>

              <h3 style={{ marginTop: 18 }}>Meine gespeicherten Berechnungen</h3>

              <div style={{ maxHeight: 280, overflowX: "auto", overflowY: "auto", border: "1px solid #eee", borderRadius: 10 }}>
                <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr style={{ background: "#fafafa" }}>
                      <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Datum</th>
                      <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #eee" }}>€ / a</th>
                      <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #eee" }}>t CO2e</th>
                      <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #eee" }}>PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>
                          {new Date(h.created_at + "Z").toLocaleString()}
                        </td>
                        <td style={{ padding: 10, textAlign: "right", borderBottom: "1px solid #f3f3f3" }}>{h.outputs.euro_a}</td>
                        <td style={{ padding: 10, textAlign: "right", borderBottom: "1px solid #f3f3f3" }}>{h.outputs.co2_t}</td>
                        <td style={{ padding: 10, textAlign: "right", borderBottom: "1px solid #f3f3f3" }}>
                          <button
                            onClick={() => downloadPDF(h.id)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 8,
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

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-start", marginTop: 12, flexWrap: "wrap" }}>
                <button
                  onClick={downloadCSV}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid #ccc",
                    background: "#f3f3f3",
                    cursor: "pointer",
                    fontWeight: 700,
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
                    borderRadius: 10,
                    border: "1px solid #ccc",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Logout
                </button>

                <button
                  type="button"
                  onClick={() => setPage("impressum")}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid #ccc",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Impressum / Datenschutz
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer style={{ padding: "12px 0", textAlign: "center", fontSize: 12, color: "#666", borderTop: "1px solid #eee" }}>
        SaveEnergyTool™ ist eine Bezeichnung des SaveEnergyTeam. Alle Rechte vorbehalten.
      </footer>
    </div>
  );
}
