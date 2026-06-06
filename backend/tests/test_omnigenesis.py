"""Omnigenesis backend API tests"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://chrono-visualizer.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


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
