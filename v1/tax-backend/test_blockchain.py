import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_verify_valid_transaction():
    """Web3 verification returns success for a valid tx hash."""
    response = client.post("/api/v1/blockchain/verify", json={
        "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bA88",
        "tx_hash": "0xabc123def456789",
        "chain": "ethereum",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["verified"] is True
    assert data["chain"] == "ethereum"
    assert data["audit_trail_valid"] is True
    assert isinstance(data["amount_usd_at_time"], (int, float))
    assert "timestamp" in data


def test_verify_invalid_transaction():
    """Web3 verification fails for an invalid (zero) tx hash."""
    response = client.post("/api/v1/blockchain/verify", json={
        "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bA88",
        "tx_hash": "0x0000000000000000000000000000000000000000",
        "chain": "ethereum",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["verified"] is False
    assert "error" in data


def test_verify_solana_chain():
    """Verification works for the Solana chain parameter."""
    response = client.post("/api/v1/blockchain/verify", json={
        "wallet_address": "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        "tx_hash": "5wHu1qwD7YwB3u7XnLSpK6pXPRs",
        "chain": "solana",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["verified"] is True
    assert data["chain"] == "solana"


def test_data_parsing_consistency():
    """Pure data parsing logic returns consistent structure."""
    response = client.post("/api/v1/blockchain/verify", json={
        "wallet_address": "0xTestWallet",
        "tx_hash": "0xTestHash",
        "chain": "ethereum",
    })
    data = response.json()
    assert set(data.keys()) >= {"verified", "chain", "amount_usd_at_time", "timestamp", "audit_trail_valid", "message"}
