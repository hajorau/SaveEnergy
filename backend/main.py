from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import os
import json
import hashlib
import hmac
import base64

import io
import csv
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4


import psycopg
from psycopg.rows import dict_row

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, conint, confloat


# ----------------------------
# App
# ----------------------------
app = FastAPI(title="Energieeffizienz Rechner")


# ----------------------------
# ENV
# ----------------------------
DATABASE_URL = os.environ.get("DATABASE_URL")
SECRET = os.environ.get("APP_SECRET", "CHANGE_ME").encode("utf-8")
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "*")


# ----------------------------
# CORS
# ----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN] if FRONTEND_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------
# Konstanten (nicht im UI)
# ----------------------------
K = {
    "T_ZUL": 18.0,
    "T_AUSSEN_M": 9.5,
    "WRG": 0.50,
    "SEP": 0.4,
    "AIR_WH_PER_M3K": 0.34,
    "EF_STROM": 560.0,
    "EF_FERNWAERME": 300.0,
    "FAN_COUNT": 2
}


# ----------------------------
# DB
# ----------------------------
def get_conn():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL fehlt")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def init_db():
    with get_conn() as con:
        with con.cursor() as cur:
            cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """)
            cur.execute("""
            CREATE TABLE IF NOT EXISTS calculations (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                created_at TEXT NOT NULL,
                inputs_json TEXT NOT NULL,
                outputs_json TEXT NOT NULL
            );
            """)
        con.commit()


try:
    if DATABASE_URL:
        init_db()
except Exception:
    pass


# ----------------------------
# Auth Helpers
# ----------------------------
def hash_password(pw: str) -> str:
    return hashlib.sha256(("salt:" + pw).encode()).hexdigest()


def sign_token(payload: Dict[str, Any], minutes: int = 1440) -> str:
    payload = dict(payload)
    payload["exp"] = (datetime.utcnow() + timedelta(minutes=minutes)).isoformat()

    raw = json.dumps(payload).encode()
    sig = hmac.new(SECRET, raw, hashlib.sha256).digest()

    return base64.urlsafe_b64encode(raw).decode() + "." + base64.urlsafe_b64encode(sig).decode()


def verify_token(token: str) -> Dict[str, Any]:
    try:
        raw_b64, sig_b64 = token.split(".")
        raw = base64.urlsafe_b64decode(raw_b64)
        sig = base64.urlsafe_b64decode(sig_b64)

        if not hmac.compare_digest(
            sig,
            hmac.new(SECRET, raw, hashlib.sha256).digest()
        ):
            raise ValueError()

        payload = json.loads(raw.decode())
        exp = datetime.fromisoformat(payload["exp"])

        if datetime.utcnow() > exp:
            raise ValueError()

        return payload

    except Exception:
        raise HTTPException(status_code=401, detail="Ungültiger Token")


def get_current_user(authorization: Optional[str] = Header(None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Nicht eingeloggt")

    token = authorization.split(" ", 1)[1]
    return int(verify_token(token)["uid"])



# ----------------------------
# Schemas
# ----------------------------
class RegisterIn(BaseModel):
    email: str
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: str
    password: str


class CalcIn(BaseModel):
    vdot_m3h: confloat(gt=0)
    strompreis_eur_kwh: confloat(gt=0)
    waermepreis_eur_kwh: confloat(gt=0)
    zeitreduktion_h_d: confloat(gt=0)
    betriebstage_d_a: conint(gt=0, le=366)


class CalcOut(BaseModel):
    waerme_kwh_a: float
    strom_kwh_a: float
    euro_a: float
    co2_t: float


class CalcRecord(BaseModel):
    id: int
    created_at: str
    inputs: Dict[str, Any]
    outputs: Dict[str, Any]


# ----------------------------
# Berechnung
# ----------------------------
def compute(inp: CalcIn) -> CalcOut:
    hours = inp.zeitreduktion_h_d * inp.betriebstage_d_a

    p_w = K["SEP"] * inp.vdot_m3h
    strom = (p_w * K["FAN_COUNT"]) * hours / 1000

    dT = K["T_ZUL"] - K["T_AUSSEN_M"]
    waerme = (
        K["AIR_WH_PER_M3K"]
        * inp.vdot_m3h
        * dT
        * (1 - K["WRG"])
        * hours
        / 1000
    )

    euro = waerme * inp.waermepreis_eur_kwh + strom * inp.strompreis_eur_kwh

    co2 = (
        strom * K["EF_STROM"] + waerme * K["EF_FERNWAERME"]
    ) / 1_000_000

    return CalcOut(
        waerme_kwh_a=round(waerme, 0),
        strom_kwh_a=round(strom, 0),
        euro_a=round(euro, 0),
        co2_t=round(co2, 2),
    )


# ----------------------------
# API
# ----------------------------
@app.post("/auth/register")
def register(data: RegisterIn):
    try:
        with get_conn() as con:
            with con.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO users(email, password_hash, created_at)
                    VALUES(%s,%s,%s)
                    """,
                    (
                        data.email.lower().strip(),
                        hash_password(data.password),
                        datetime.utcnow().isoformat(),
                    ),
                )
            con.commit()

        return {"ok": True}

    except psycopg.errors.UniqueViolation:
        raise HTTPException(400, "E-Mail existiert")


@app.post("/auth/login")
def login(data: LoginIn):
    with get_conn() as con:
        with con.cursor() as cur:
            cur.execute(
                "SELECT id,password_hash FROM users WHERE email=%s",
                (data.email.lower().strip(),),
            )
            row = cur.fetchone()

    if not row or row["password_hash"] != hash_password(data.password):
        raise HTTPException(401, "Login falsch")

    return {"token": sign_token({"uid": row["id"]})}


@app.post("/calc", response_model=CalcOut)
def create_calc(inp: CalcIn, uid: int = Depends(get_current_user)):
    out = compute(inp)

    with get_conn() as con:
        with con.cursor() as cur:
            cur.execute(
                """
                INSERT INTO calculations(user_id,created_at,inputs_json,outputs_json)
                VALUES(%s,%s,%s,%s)
                """,
                (
                    uid,
                    datetime.utcnow().isoformat(),
                    inp.model_dump_json(),
                    out.model_dump_json(),
                ),
            )
        con.commit()

    return out


@app.get("/calc", response_model=List[CalcRecord])
def list_calc(uid: int = Depends(get_current_user)):
    with get_conn() as con:
        with con.cursor() as cur:
            cur.execute(
                """
                SELECT id,created_at,inputs_json,outputs_json
                FROM calculations
                WHERE user_id=%s
                ORDER BY id DESC
                """,
                (uid,),
            )
            rows = cur.fetchall()

    return [

def get_calc_for_user(calc_id: int, uid: int) -> Dict[str, Any]:
    with get_conn() as con:
        with con.cursor() as cur:
            cur.execute(
                "SELECT id, created_at, inputs_json, outputs_json FROM calculations WHERE id=%s AND user_id=%s",
                (calc_id, uid),
            )
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Berechnung nicht gefunden")
    return row


        
        CalcRecord(
            id=r["id"],
            created_at=r["created_at"],
            inputs=json.loads(r["inputs_json"]),
            outputs=json.loads(r["outputs_json"]),
        )
        for r in rows
    ]


from fastapi.responses import StreamingResponse

@app.get("/calc/{calc_id}/export/pdf")
def export_calc_pdf(calc_id: int, uid: int = Depends(get_current_user)):
    row = get_calc_for_user(calc_id, uid)
    inputs = json.loads(row["inputs_json"])
    outputs = json.loads(row["outputs_json"])

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 60
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, "SaveEnergy – Berechnungsbericht")
    y -= 25

    c.setFont("Helvetica", 10)
    c.drawString(50, y, f"ID: {row['id']}   Datum: {row['created_at']}")
    y -= 30

    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Eingaben")
    y -= 18
    c.setFont("Helvetica", 11)
    lines_in = [
        f"Volumenstrom: {inputs.get('vdot_m3h')} m³/h",
        f"Strompreis: {inputs.get('strompreis_eur_kwh')} €/kWh",
        f"Wärmepreis: {inputs.get('waermepreis_eur_kwh')} €/kWh",
        f"Zeitreduktion: {inputs.get('zeitreduktion_h_d')} h/d",
        f"Betriebstage: {inputs.get('betriebstage_d_a')} d/a",
    ]
    for line in lines_in:
        c.drawString(60, y, line)
        y -= 16

    y -= 10
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Ergebnisse")
    y -= 18
    c.setFont("Helvetica", 11)
    lines_out = [
        f"Einsparung Wärme: {outputs.get('waerme_kwh_a')} kWh/a",
        f"Einsparung Strom: {outputs.get('strom_kwh_a')} kWh/a",
        f"Kosteneinsparung: {outputs.get('euro_a')} €/a",
        f"CO₂-Einsparung: {outputs.get('co2_t')} t CO₂e",
    ]
    for line in lines_out:
        c.drawString(60, y, line)
        y -= 16

    c.showPage()
    c.save()

    buffer.seek(0)
    filename = f"saveenergy_calc_{calc_id}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
@app.get("/calc/export/csv")
def export_calc_csv(uid: int = Depends(get_current_user)):
    with get_conn() as con:
        with con.cursor() as cur:
            cur.execute(
                "SELECT id, created_at, inputs_json, outputs_json FROM calculations WHERE user_id=%s ORDER BY id DESC",
                (uid,),
            )
            rows = cur.fetchall()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")

    writer.writerow([
        "id", "created_at",
        "vdot_m3h", "strompreis_eur_kwh", "waermepreis_eur_kwh", "zeitreduktion_h_d", "betriebstage_d_a",
        "waerme_kwh_a", "strom_kwh_a", "euro_a", "co2_t"
    ])

    for r in rows:
        inputs = json.loads(r["inputs_json"])
        outputs = json.loads(r["outputs_json"])
        writer.writerow([
            r["id"], r["created_at"],
            inputs.get("vdot_m3h"),
            inputs.get("strompreis_eur_kwh"),
            inputs.get("waermepreis_eur_kwh"),
            inputs.get("zeitreduktion_h_d"),
            inputs.get("betriebstage_d_a"),
            outputs.get("waerme_kwh_a"),
            outputs.get("strom_kwh_a"),
            outputs.get("euro_a"),
            outputs.get("co2_t"),
        ])

    data = output.getvalue().encode("utf-8")
    filename = "saveenergy_calcs.csv"
    return StreamingResponse(
        io.BytesIO(data),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
