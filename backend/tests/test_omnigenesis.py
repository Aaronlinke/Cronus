"""Omnigenesis backend API tests (iter3: WS + rate-limit)"""
import os
import time
import json
import asyncio
import requests
import pytest
import websockets

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://chrono-visualizer.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"
WS_URL = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws/terminal"


class TestInversionPersistence:
    """Iteration 2: MongoDB persistence + history endpoints"""

    def test_run_returns_id_and_persists(self):
        payload = {
            "causality_entropy": 0.42,
            "twist_45": 0.51,
            "pec_gamma": 0.33,
            "target_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            "target_hash160": "62e907b15cbf27d5425399ebf6f0fb50ebb88f18",
        }
        r = requests.post(f"{API}/inversion/run", json=payload, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "id" in d and len(d["id"]) >= 32, f"id missing/short: {d.get('id')}"
        assert "created_at" in d
        assert d.get("target_hash160") == payload["target_hash160"]
        assert d.get("target_address") == payload["target_address"]
        inv_id = d["id"]

        # GET history → entry should appear
        h = requests.get(f"{API}/inversion/history", timeout=15)
        assert h.status_code == 200
        items = h.json()
        assert isinstance(items, list) and len(items) > 0
        ids = [it["id"] for it in items]
        assert inv_id in ids, "persisted inversion not found in history"
        found = next(it for it in items if it["id"] == inv_id)
        assert found["target_hash160"] == payload["target_hash160"]
        assert found["causality_entropy"] == pytest.approx(0.42)

    def test_history_sorted_desc_by_created_at(self):
        # Insert two records
        for ce in (0.11, 0.99):
            requests.post(
                f"{API}/inversion/run",
                json={"causality_entropy": ce, "twist_45": 0.2, "pec_gamma": 0.2},
                timeout=15,
            )
        h = requests.get(f"{API}/inversion/history", timeout=15)
        assert h.status_code == 200
        items = h.json()
        assert len(items) >= 2
        timestamps = [it["created_at"] for it in items]
        assert timestamps == sorted(timestamps, reverse=True), "history not sorted desc"

    def test_history_limit_param(self):
        # Ensure ≥3 records present
        for _ in range(3):
            requests.post(
                f"{API}/inversion/run",
                json={"causality_entropy": 0.5, "twist_45": 0.5, "pec_gamma": 0.5},
                timeout=15,
            )
        h = requests.get(f"{API}/inversion/history?limit=5", timeout=15)
        assert h.status_code == 200
        items = h.json()
        assert isinstance(items, list)
        assert len(items) <= 5

    def test_delete_history_clears(self):
        # Seed at least one
        requests.post(
            f"{API}/inversion/run",
            json={"causality_entropy": 0.5, "twist_45": 0.5, "pec_gamma": 0.5},
            timeout=15,
        )
        d = requests.delete(f"{API}/inversion/history", timeout=15)
        assert d.status_code == 200
        body = d.json()
        assert "deleted" in body
        # Verify empty after
        h = requests.get(f"{API}/inversion/history", timeout=15)
        assert h.status_code == 200
        assert h.json() == []


class TestRoot:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("service") == "omnigenesis"
        assert data.get("status") == "online"
        assert "transport" in data
        assert "ws" in data["transport"] and "sse" in data["transport"]


# ----- WebSocket Terminal -----
class TestWebSocketTerminal:
    @pytest.mark.asyncio
    async def test_hello_on_connect(self):
        async with websockets.connect(WS_URL, open_timeout=10) as ws:
            msg = await asyncio.wait_for(ws.recv(), timeout=5)
            d = json.loads(msg)
            assert d.get("kind") == "hello"

    @pytest.mark.asyncio
    async def test_set_target_emits_two_lock_messages(self):
        async with websockets.connect(WS_URL, open_timeout=10) as ws:
            # consume hello
            await asyncio.wait_for(ws.recv(), timeout=5)
            await ws.send(json.dumps({
                "type": "set_target",
                "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
                "hash160": "62e907b15cbf27d5425399ebf6f0fb50ebb88f18",
            }))
            locks = []
            deadline = time.time() + 5
            while time.time() < deadline and len(locks) < 2:
                raw = await asyncio.wait_for(ws.recv(), timeout=3)
                d = json.loads(raw)
                if d.get("kind") == "lock":
                    locks.append(d.get("line", ""))
            assert len(locks) >= 2
            joined = " ".join(locks)
            assert "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa" in joined
            assert "62e907b15cbf27d5425399ebf6f0fb50ebb88f18" in joined

    @pytest.mark.asyncio
    async def test_pause_stops_and_resume_restarts(self):
        async with websockets.connect(WS_URL, open_timeout=10) as ws:
            # consume hello + collect some logs
            await asyncio.wait_for(ws.recv(), timeout=5)
            got_log = False
            deadline = time.time() + 4
            while time.time() < deadline and not got_log:
                raw = await asyncio.wait_for(ws.recv(), timeout=3)
                if json.loads(raw).get("kind") == "log":
                    got_log = True
            assert got_log, "no logs before pause"

            await ws.send(json.dumps({"type": "pause"}))
            # Drain any in-flight messages for ~1.2s
            try:
                while True:
                    await asyncio.wait_for(ws.recv(), timeout=1.2)
            except asyncio.TimeoutError:
                pass
            # Now no log should arrive within ~1.5s
            paused_silent = False
            try:
                await asyncio.wait_for(ws.recv(), timeout=1.5)
            except asyncio.TimeoutError:
                paused_silent = True
            assert paused_silent, "logs still streaming after pause"

            # Resume → logs again
            await ws.send(json.dumps({"type": "resume"}))
            resumed = False
            deadline = time.time() + 4
            while time.time() < deadline and not resumed:
                raw = await asyncio.wait_for(ws.recv(), timeout=3)
                if json.loads(raw).get("kind") == "log":
                    resumed = True
            assert resumed, "no logs after resume"

    @pytest.mark.asyncio
    async def test_continuous_log_format(self):
        async with websockets.connect(WS_URL, open_timeout=10) as ws:
            await asyncio.wait_for(ws.recv(), timeout=5)  # hello
            logs = []
            deadline = time.time() + 4
            while time.time() < deadline and len(logs) < 3:
                raw = await asyncio.wait_for(ws.recv(), timeout=3)
                d = json.loads(raw)
                if d.get("kind") == "log":
                    logs.append(d.get("line", ""))
            assert len(logs) >= 3
            for line in logs:
                # format: [HH:MM:SS.mmm] [TAG] ...
                assert line.startswith("[") and "] [" in line


# ----- Rate limiting -----
class TestRateLimit:
    def test_run_rate_limit_429(self):
        payload = {"causality_entropy": 0.5, "twist_45": 0.5, "pec_gamma": 0.5}
        last_status = None
        hit_429 = False
        for _ in range(33):
            r = requests.post(f"{API}/inversion/run", json=payload, timeout=10)
            last_status = r.status_code
            if r.status_code == 429:
                hit_429 = True
                break
        assert hit_429, f"expected 429 within 33 calls, last={last_status}"

    def test_history_rate_limit_429(self):
        hit_429 = False
        for _ in range(65):
            r = requests.get(f"{API}/inversion/history?limit=1", timeout=10)
            if r.status_code == 429:
                hit_429 = True
                break
        assert hit_429, "expected 429 on history within 65 calls"


class TestInversionRun:
    def test_run_valid(self):
        payload = {"causality_entropy": 0.5, "twist_45": 0.5, "pec_gamma": 0.5}
        r = requests.post(f"{API}/inversion/run", json=payload, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["wif", "fingerprint", "phi", "gamma", "elapsed_ms", "steps"]:
            assert k in d, f"missing {k}"
        assert isinstance(d["wif"], str)
        assert 49 <= len(d["wif"]) <= 53, f"wif length {len(d['wif'])}"
        assert isinstance(d["steps"], list) and len(d["steps"]) > 0
        for s in d["steps"]:
            assert "t" in s and "tag" in s and "msg" in s

    def test_run_out_of_range_entropy(self):
        payload = {"causality_entropy": 1.5, "twist_45": 0.5, "pec_gamma": 0.5}
        r = requests.post(f"{API}/inversion/run", json=payload, timeout=15)
        assert r.status_code == 422

    def test_run_negative(self):
        payload = {"causality_entropy": -0.1, "twist_45": 0.5, "pec_gamma": 0.5}
        r = requests.post(f"{API}/inversion/run", json=payload, timeout=15)
        assert r.status_code == 422

    def test_run_missing_field(self):
        payload = {"causality_entropy": 0.5, "twist_45": 0.5}
        r = requests.post(f"{API}/inversion/run", json=payload, timeout=15)
        assert r.status_code == 422


class TestInversionStream:
    def test_stream_content_type_and_data(self):
        start = time.time()
        with requests.get(f"{API}/inversion/stream", stream=True, timeout=10) as r:
            assert r.status_code == 200
            ct = r.headers.get("content-type", "")
            assert "text/event-stream" in ct, f"unexpected content-type: {ct}"
            got_data = False
            for raw in r.iter_lines(decode_unicode=True):
                if raw and raw.startswith("data:"):
                    got_data = True
                    break
                if time.time() - start > 5:
                    break
            assert got_data, "no data: line received within 5s"
