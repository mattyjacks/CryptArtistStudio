import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
from web3.datastructures import AttributeDict
from main import app

client = TestClient(app)

# Valid format constants
VALID_ETH_ADDR = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bA88"
VALID_TX_HASH = "0x" + "a" * 64  # 66 chars total

@patch("routers.blockchain.get_web3_provider")
def test_verify_valid_transaction(mock_get_provider):
    """Web3 verification returns success for a valid tx hash and matching sender."""
    # Mock Web3 setup
    mock_w3 = MagicMock()
    mock_get_provider.return_value = mock_w3
    
    # Mock Transaction and Receipt using AttributeDict for dot access
    mock_w3.eth.get_transaction.return_value = AttributeDict({
        "from": VALID_ETH_ADDR.lower(),
        "value": 1000000000000000000  # 1 ETH in Wei
    })
    mock_w3.eth.get_transaction_receipt.return_value = AttributeDict({
        "status": 1,
        "blockNumber": 123456,
        "gasUsed": 21000
    })
    mock_w3.from_wei.return_value = 1.0

    response = client.post("/api/v1/blockchain/verify", json={
        "wallet_address": VALID_ETH_ADDR,
        "tx_hash": VALID_TX_HASH,
        "chain": "ethereum",
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["verified"] is True
    assert data["amount_eth"] == 1.0
    assert "Successfully verified" in data["message"]


@patch("routers.blockchain.get_web3_provider")
def test_verify_failed_transaction(mock_get_provider):
    """Verification fails if on-chain status is 0 (reverted)."""
    mock_w3 = MagicMock()
    mock_get_provider.return_value = mock_w3
    
    mock_w3.eth.get_transaction.return_value = AttributeDict({"from": VALID_ETH_ADDR.lower()})
    mock_w3.eth.get_transaction_receipt.return_value = AttributeDict({"status": 0}) # Failed

    response = client.post("/api/v1/blockchain/verify", json={
        "wallet_address": VALID_ETH_ADDR,
        "tx_hash": VALID_TX_HASH,
        "chain": "ethereum",
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["verified"] is False
    assert "Transaction failed on-chain" in data["error"]


def test_verify_invalid_format():
    """Verification fails immediately for invalid address/hash formats."""
    # Invalid Address
    response = client.post("/api/v1/blockchain/verify", json={
        "wallet_address": "0xNotAnAddress",
        "tx_hash": VALID_TX_HASH,
        "chain": "ethereum",
    })
    assert response.json()["verified"] is False
    assert "Invalid wallet address" in response.json()["error"]

    # Invalid Hash Length
    response = client.post("/api/v1/blockchain/verify", json={
        "wallet_address": VALID_ETH_ADDR,
        "tx_hash": "0x123", # Too short
        "chain": "ethereum",
    })
    assert response.json()["verified"] is False
    assert "Invalid transaction hash" in response.json()["error"]


@patch("routers.blockchain.get_web3_provider")
def test_verify_sender_mismatch(mock_get_provider):
    """Verification fails if the sender address doesn't match the wallet address."""
    mock_w3 = MagicMock()
    mock_get_provider.return_value = mock_w3
    
    # Tx sent by SOMEONE ELSE
    mock_w3.eth.get_transaction.return_value = AttributeDict({
        "from": "0x0000000000000000000000000000000000000000", 
        "value": 0
    })
    mock_w3.eth.get_transaction_receipt.return_value = AttributeDict({"status": 1})

    response = client.post("/api/v1/blockchain/verify", json={
        "wallet_address": VALID_ETH_ADDR, # Claiming address
        "tx_hash": VALID_TX_HASH,
        "chain": "ethereum",
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["verified"] is False
    assert "Sender mismatch" in data["error"]


@patch("httpx.AsyncClient")
def test_verify_solana_valid(mock_async_client):
    """Solana verification returns success for valid tx."""
    # Mock the response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "result": {
            "meta": {
                "err": None,
                "preBalances": [2000000000, 500],
                "postBalances": [1000000000, 500]
            },
            "transaction": {
                "message": {
                    "accountKeys": ["5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", "RecipientAddress"]
                }
            },
            "slot": 123456789,
            "blockTime": 1600000000
        }
    }

    # Mock the client instance
    mock_client_instance = AsyncMock()
    mock_client_instance.post.return_value = mock_response
    
    # Mock context manager
    mock_async_client.return_value.__aenter__.return_value = mock_client_instance

    response = client.post("/api/v1/blockchain/verify", json={
        "wallet_address": "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        "tx_hash": "5wHu1qwD7YwB3u7XnLSpK6pXPRs",
        "chain": "solana",
    })

    assert response.status_code == 200
    data = response.json()
    assert data["verified"] is True
    assert data["chain"] == "solana"
    # 2 SOL - 1 SOL = 1 SOL
    assert data["amount_sol"] == 1.0 
    assert "Successfully verified" in data["message"]


@patch("httpx.AsyncClient")
def test_verify_solana_sender_mismatch(mock_async_client):
    """Solana verification fails if sender does not match."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "result": {
            "meta": {"err": None},
            "transaction": {
                "message": {
                    "accountKeys": ["OtherAddress", "RecipientAddress"]
                }
            }
        }
    }

    mock_client_instance = AsyncMock()
    mock_client_instance.post.return_value = mock_response
    
    mock_async_client.return_value.__aenter__.return_value = mock_client_instance

    response = client.post("/api/v1/blockchain/verify", json={
        "wallet_address": "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        "tx_hash": "5wHu1qwD7YwB3u7XnLSpK6pXPRs",
        "chain": "solana",
    })

    assert response.status_code == 200
    data = response.json()
    assert data["verified"] is False
    assert "Sender mismatch" in data["error"]

