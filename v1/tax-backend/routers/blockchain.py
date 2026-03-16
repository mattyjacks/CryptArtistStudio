from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from web3 import Web3
from web3.exceptions import TransactionNotFound
import httpx
import os

router = APIRouter()

# List of public RPCs to try
# In production, use a private node (Alchemy/Infura) via env vars
RPC_URLS = {
    "ethereum": [
        "https://cloudflare-eth.com",
        "https://rpc.ankr.com/eth",
        "https://eth.llamarpc.com"
    ],
    "polygon": ["https://polygon-rpc.com"],
    "arbitrum": ["https://arb1.arbitrum.io/rpc"],
}

SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com"

class VerifyRequest(BaseModel):
    wallet_address: str
    tx_hash: str
    chain: str = "ethereum"

def get_web3_provider(chain: str):
    """Returns a connected Web3 instance or None."""
    urls = RPC_URLS.get(chain.lower(), [])
    for url in urls:
        try:
            w3 = Web3(Web3.HTTPProvider(url))
            if w3.is_connected():
                return w3
        except:
            continue
    return None

async def verify_solana(tx_hash: str, wallet_address: str):
    """Verifies a Solana transaction using JSON RPC."""
    async with httpx.AsyncClient() as client:
        try:
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getTransaction",
                "params": [
                    tx_hash,
                    {"encoding": "json", "maxSupportedTransactionVersion": 0}
                ]
            }
            response = await client.post(SOLANA_RPC_URL, json=payload, timeout=10.0)
            if response.status_code != 200:
                return {"verified": False, "error": f"Solana RPC Error: {response.status_code}"}
            
            data = response.json()
            if "error" in data:
                return {"verified": False, "error": f"RPC Error: {data['error'].get('message', 'Unknown error')}"}
            
            result = data.get("result")
            if not result:
                return {"verified": False, "error": "Transaction not found on Solana chain."}
            
            # Check for errors
            if result.get("meta", {}).get("err") is not None:
                return {"verified": False, "error": "Transaction failed on-chain."}
            
            # Check sender (first account in accountKeys is usually the payer/sender)
            account_keys = result["transaction"]["message"]["accountKeys"]
            # accountKeys can be list of strings or list of objects depending on version/encoding
            sender = account_keys[0] if isinstance(account_keys[0], str) else account_keys[0].get("pubkey")
            
            if sender.lower() != wallet_address.lower():
                return {
                    "verified": False, 
                    "error": f"Sender mismatch. Tx signer is {sender}, not {wallet_address}."
                }
            
            # Calculate amount (simplified approximation using pre/post balances of sender)
            meta = result["meta"]
            pre_balance = meta["preBalances"][0]
            post_balance = meta["postBalances"][0]
            # This includes fees, so it's roughly the amount spent
            amount_lamports = pre_balance - post_balance
            amount_sol = amount_lamports / 1_000_000_000
            
            return {
                "verified": True,
                "chain": "solana",
                "amount_sol": amount_sol,
                "slot": result.get("slot"),
                "block_time": result.get("blockTime"),
                "message": "Successfully verified on Solana."
            }
            
        except Exception as e:
            return {"verified": False, "error": f"Solana Verification Error: {str(e)}"}

@router.post("/verify")
async def verify_transaction(req: VerifyRequest):
    """
    Verifies a crypto payment on-chain using public RPC nodes.
    Validates format, existence, status, and sender.
    """
    chain_key = req.chain.lower()
    
    if chain_key == "solana":
        return await verify_solana(req.tx_hash, req.wallet_address)
    
    # Ethereum Logic
    # 1. Basic Format Validation
    if not Web3.is_address(req.wallet_address):
        return {"verified": False, "error": "Invalid wallet address format."}
    
    checksum_address = Web3.to_checksum_address(req.wallet_address)
    
    if not req.tx_hash.startswith("0x") or len(req.tx_hash) != 66:
         return {"verified": False, "error": "Invalid transaction hash format (must be 66 chars hex)."}

    # 2. Connect to RPC
    w3 = get_web3_provider(chain_key)
    
    if not w3:
        return {
            "verified": False, 
            "error": f"Could not connect to {req.chain} network. Please try again later or check your internet."
        }

    try:
        # 3. Fetch Transaction
        try:
            tx = w3.eth.get_transaction(req.tx_hash)
            receipt = w3.eth.get_transaction_receipt(req.tx_hash)
        except TransactionNotFound:
            return {"verified": False, "error": "Transaction not found on chain."}

        # 4. Verify Status (1 = Success)
        if receipt.status != 1:
            return {"verified": False, "error": "Transaction failed on-chain (reverted)."}

        # 5. Verify Sender matches provided wallet
        if tx["from"].lower() != checksum_address.lower():
             return {
                 "verified": False, 
                 "error": f"Sender mismatch. Tx sent by {tx['from']}, not {checksum_address}."
             }

        # Success
        return {
            "verified": True,
            "chain": req.chain,
            "amount_wei": str(tx["value"]),
            "amount_eth": float(Web3.from_wei(tx["value"], 'ether')),
            "block_number": receipt["blockNumber"],
            "gas_used": receipt["gasUsed"],
            "message": f"Successfully verified on {req.chain}."
        }

    except Exception as e:
        return {"verified": False, "error": f"RPC Error: {str(e)}"}
