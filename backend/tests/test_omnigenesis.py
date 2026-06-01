"""Omnigenesis backend API tests"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://chrono-visualizer.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


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
