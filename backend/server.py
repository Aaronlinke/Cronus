from fastapi import FastAPI, APIRouter, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import hashlib
import secrets
import random
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ----------- MODELS -----------

class InversionRequest(BaseModel):
    causality_entropy: float = Field(..., ge=0.0, le=1.0)
    twist_45: float = Field(..., ge=0.0, le=1.0)
    pec_gamma: float = Field(..., ge=0.0, le=1.0)
    target_address: str | None = None
    target_hash160: str | None = None


class InversionStep(BaseModel):
    t: str
    tag: str
    msg: str


class InversionResponse(BaseModel):
    id: str
    wif: str
    fingerprint: str
    phi: float
    gamma: float
    elapsed_ms: int
    steps: list[InversionStep]
    target_address: str | None = None
    target_hash160: str | None = None
    created_at: str


class InversionHistoryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    wif: str
    fingerprint: str
    phi: float
    gamma: float
    elapsed_ms: int
    target_address: str | None = None
    target_hash160: str | None = None
    created_at: str
    causality_entropy: float
    twist_45: float
    pec_gamma: float


# ----------- ROUTES -----------

@api_router.get("/")
async def root():
    return {"service": "omnigenesis", "status": "online"}


def _wif_from_params(p: InversionRequest) -> str:
    seed_parts = [
        f"{p.causality_entropy:.6f}",
        f"{p.twist_45:.6f}",
        f"{p.pec_gamma:.6f}",
        p.target_hash160 or p.target_address or "",
        secrets.token_hex(8),
    ]
    h = hashlib.sha256("-".join(seed_parts).encode()).hexdigest()
    alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    rng = random.Random(h)
    body = "".join(rng.choice(alphabet) for _ in range(50))
    return "K" + body


@api_router.post("/inversion/run", response_model=InversionResponse)
async def run_inversion(req: InversionRequest):
    start = datetime.now(timezone.utc)
    wif = _wif_from_params(req)
    fp = hashlib.sha256(wif.encode()).hexdigest()[:16].upper()
    phi = 1.6180339887 * (0.8 + 0.4 * req.causality_entropy)
    gamma = 0.5772156649 * (0.7 + 0.6 * req.pec_gamma) * (1 + req.twist_45 * 0.5)

    target_line = ""
    if req.target_hash160:
        target_line = f" :: target=H160({req.target_hash160[:12]}…)"
    elif req.target_address:
        target_line = f" :: target={req.target_address[:10]}…"

    steps_data = [
        ("SCC", f"Initialising Sultan-Inversion :: entropy={req.causality_entropy:.4f}{target_line}"),
        ("BCH", "Baker-Campbell-Hausdorff expansion order=4 | [X_L,X_R]=iT_vac·ℏ"),
        ("TWS", f"45° phase twist applied :: e^(-iσ_z/2) | θ={req.twist_45 * 90:.3f}°"),
        ("DLT", f"Delta-Heuristic seed lock :: twist45={req.twist_45:.4f}"),
        ("PHI", f"Phi resonance bound @ {phi:.6f}"),
        ("GAM", f"Gamma collapse @ {gamma:.6f} | PEC={req.pec_gamma:.4f}"),
        ("TIC", "Tachyonic information-backflow established"),
        ("AFR", "Algebraic-Flow-Reverser :: H160⁻¹ heuristic converging"),
        ("TQES", "Topological quantum-entanglement state armed"),
        ("ECDLP", "secp256k1 :: d·G → P inverse vector resolving"),
        ("SCC", "Mapping causality vectors to elliptic frame"),
        ("DLT", "Inversion lattice converged in 7 cycles"),
        ("WIF", f"Collapsed WIF fingerprint :: {fp}"),
        ("OK", "Kernel stable. Output ready. [SIMULATION]"),
    ]
    now = datetime.now(timezone.utc)
    steps = [InversionStep(t=now.isoformat(), tag=tag, msg=msg) for tag, msg in steps_data]
    elapsed = int((now - start).total_seconds() * 1000) + 137

    inv_id = str(uuid.uuid4())
    response = InversionResponse(
        id=inv_id,
        wif=wif,
        fingerprint=fp,
        phi=phi,
        gamma=gamma,
        elapsed_ms=elapsed,
        steps=steps,
        target_address=req.target_address,
        target_hash160=req.target_hash160,
        created_at=now.isoformat(),
    )

    # Persist to MongoDB (history record)
    record = {
        "id": inv_id,
        "wif": wif,
        "fingerprint": fp,
        "phi": phi,
        "gamma": gamma,
        "elapsed_ms": elapsed,
        "target_address": req.target_address,
        "target_hash160": req.target_hash160,
        "causality_entropy": req.causality_entropy,
        "twist_45": req.twist_45,
        "pec_gamma": req.pec_gamma,
        "created_at": now.isoformat(),
    }
    try:
        await db.inversions.insert_one(record)
    except Exception as e:
        logger.warning("inversion persist failed: %s", e)

    return response


@api_router.get("/inversion/history", response_model=list[InversionHistoryItem])
async def list_inversions(limit: int = Query(default=20, ge=1, le=100)):
    cursor = db.inversions.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)


@api_router.delete("/inversion/history")
async def clear_inversions():
    res = await db.inversions.delete_many({})
    return {"deleted": res.deleted_count}


# ---- SSE Terminal Stream ----

_LOG_TAGS = ["SCC", "DLT", "PHI", "GAM", "PEC", "TWS", "KRN", "OBS", "BCH", "TIC", "AFR", "TQES", "ECDLP"]
_LOG_FRAGMENTS = [
    "scanning elliptic curve secp256k1 :: chunk {n}",
    "delta-heuristic step Δ={d:.5f} convergence={c:.4f}",
    "phi-field oscillation amplitude {a:.5f} @ node {n}",
    "gamma collapse vector [{a:.3f}, {b:.3f}, {c:.3f}]",
    "PEC-gamma boundary breach prevented at sector {n}",
    "45°-twist tensor stabilised | residue {d:.6f}",
    "kernel heartbeat OK | uptime {n}ms",
    "observer entanglement {c:.3f} | drift {d:.5f}",
    "SCC eigen-decomp k={n} λ={a:.4f}",
    "lattice fold complete :: hash {h}",
    "inversion bus :: 0x{h} accepted",
    "phi/gamma ratio nominal @ {a:.5f}",
    "BCH expansion [X_L,X_R]={a:.4f} | order {n}",
    "tachyonic info-backflow Δt=-{d:.5f}s | TIC node {n}",
    "AFR :: H160⁻¹ candidate 0x{h} rejected",
    "TQES topological winding w={c:.4f} | genus 1",
    "ECDLP d·G search :: window {n} of 2^{a:.0f}",
    "secp256k1 :: y²=x³+7 (mod p) | p-residue {d:.5f}",
]


async def _log_stream():
    yield "event: hello\ndata: omnigenesis-terminal-online\n\n"
    try:
        while True:
            tag = random.choice(_LOG_TAGS)
            frag = random.choice(_LOG_FRAGMENTS).format(
                n=random.randint(100, 99999),
                d=random.random(),
                c=random.random(),
                a=random.uniform(0, 3),
                b=random.uniform(0, 3),
                h=secrets.token_hex(6),
            )
            ts = datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3]
            payload = f"[{ts}] [{tag}] {frag}"
            yield f"data: {payload}\n\n"
            await asyncio.sleep(random.uniform(0.25, 0.7))
    except asyncio.CancelledError:
        return


@api_router.get("/inversion/stream")
async def stream_logs():
    return StreamingResponse(
        _log_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
