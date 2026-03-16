import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_batch_upload_returns_200():
    """Document ingestion endpoint returns 200 OK."""
    # Create a dummy PDF-like file in memory
    dummy_content = b"%PDF-1.4 fake content for testing"
    files = [("files", ("test_doc.pdf", dummy_content, "application/pdf"))]
    response = client.post("/api/v1/ingestion/batch", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "batch_id" in data
    assert data["batch_id"].startswith("batch_")
    assert len(data["files"]) == 1
    assert data["files"][0]["filename"] == "test_doc.pdf"
    assert data["files"][0]["status"] == "processing"


def test_batch_upload_multiple_files():
    """Supports uploading multiple files at once."""
    files = [
        ("files", (f"doc_{i}.pdf", b"%PDF fake", "application/pdf"))
        for i in range(5)
    ]
    response = client.post("/api/v1/ingestion/batch", files=files)
    assert response.status_code == 200
    data = response.json()
    assert len(data["files"]) == 5


def test_dashboard_returns_transactions():
    """Dashboard endpoint returns structured transaction data."""
    response = client.get("/api/v1/ingestion/dashboard?batch_id=batch_test123")
    assert response.status_code == 200
    data = response.json()
    assert data["batch_id"] == "batch_test123"
    assert "transactions" in data
    assert len(data["transactions"]) > 0
    tx = data["transactions"][0]
    assert "id" in tx
    assert "vendor" in tx
    assert "linkedW8" in tx


def test_mock_ocr_extraction_returns_valid_json():
    """The mock OCR extraction returns valid JSON containing a categorized transaction."""
    response = client.get("/api/v1/ingestion/dashboard?batch_id=batch_mock")
    assert response.status_code == 200
    data = response.json()
    for tx in data["transactions"]:
        assert isinstance(tx["id"], int)
        assert isinstance(tx["amount"], (int, float))
        assert tx["entity"] in ["C-Corp", "Individual", "LLC", "S-Corp", "Sole Proprietorship"]
        assert tx["linkedW8"].startswith("W8BEN_") or tx["linkedW8"] == "Missing"


def test_apply_rules_nh_llc():
    """Tax rules engine correctly applies NH BPT for LLC above threshold."""
    response = client.post("/api/v1/ingestion/apply-rules", json={
        "entity_type": "LLC",
        "gross_receipts": 300000,
        "region": "new hampshire",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["region"] == "new hampshire"
    assert data["entity_type"] == "LLC"
    tax_types = [t["tax_type"] for t in data["taxes_due"]]
    assert "Business Enterprise Tax (BET)" in tax_types
    assert "Business Profits Tax (BPT)" in tax_types


def test_apply_rules_cavite_individual():
    """Tax rules engine correctly applies Cavite BIR for Individual."""
    response = client.post("/api/v1/ingestion/apply-rules", json={
        "entity_type": "Individual",
        "gross_receipts": 50000,
        "region": "cavite",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["region"] == "cavite"
    tax_types = [t["tax_type"] for t in data["taxes_due"]]
    assert "Percentage Tax / Income Tax" in tax_types


def test_apply_rules_nh_individual_no_tax():
    """NH individuals generally don't owe state income tax."""
    response = client.post("/api/v1/ingestion/apply-rules", json={
        "entity_type": "Individual",
        "gross_receipts": 50000,
        "region": "new hampshire",
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["taxes_due"]) == 0
    assert "note" in data
