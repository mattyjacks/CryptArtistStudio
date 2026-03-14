import pytest
from services.tax_rules import apply_tax_rules
from services.ai_linking import link_w8ben_to_payout


class TestTaxRules:
    def test_nh_llc_above_bet_threshold(self):
        """LLC with gross receipts > $250k should owe BET in NH."""
        result = apply_tax_rules({"entity_type": "LLC", "gross_receipts": 300000}, "new hampshire")
        tax_types = [t["tax_type"] for t in result["taxes_due"]]
        assert "Business Enterprise Tax (BET)" in tax_types

    def test_nh_llc_above_bpt_threshold(self):
        """LLC with gross receipts > $103k should owe BPT in NH."""
        result = apply_tax_rules({"entity_type": "LLC", "gross_receipts": 150000}, "new hampshire")
        tax_types = [t["tax_type"] for t in result["taxes_due"]]
        assert "Business Profits Tax (BPT)" in tax_types

    def test_nh_llc_below_all_thresholds(self):
        """LLC with gross receipts < $103k should owe no taxes in NH."""
        result = apply_tax_rules({"entity_type": "LLC", "gross_receipts": 50000}, "new hampshire")
        assert len(result["taxes_due"]) == 0

    def test_nh_individual_no_income_tax(self):
        """Individuals in NH generally don't pay state income tax."""
        result = apply_tax_rules({"entity_type": "Individual", "gross_receipts": 100000}, "new hampshire")
        assert len(result["taxes_due"]) == 0
        assert "note" in result

    def test_nh_ccorp_both_taxes(self):
        """C-Corp above both thresholds should owe BET and BPT."""
        result = apply_tax_rules({"entity_type": "C-Corp", "gross_receipts": 500000}, "new hampshire")
        tax_types = [t["tax_type"] for t in result["taxes_due"]]
        assert "Business Enterprise Tax (BET)" in tax_types
        assert "Business Profits Tax (BPT)" in tax_types

    def test_nh_bet_calculation(self):
        """BET should be approximately 0.55% of gross receipts."""
        result = apply_tax_rules({"entity_type": "LLC", "gross_receipts": 300000}, "new hampshire")
        bet = next(t for t in result["taxes_due"] if "BET" in t["tax_type"])
        assert abs(bet["amount_estimated"] - 300000 * 0.0055) < 0.01

    def test_cavite_individual_bir(self):
        """Individuals in Cavite should have BIR 1701Q tax."""
        result = apply_tax_rules({"entity_type": "Individual", "gross_receipts": 80000}, "cavite")
        tax_types = [t["tax_type"] for t in result["taxes_due"]]
        assert "Percentage Tax / Income Tax" in tax_types
        form = next(t for t in result["taxes_due"] if "Percentage Tax" in t["tax_type"])
        assert form["form_required"] == "BIR Form 1701Q"

    def test_report_structure(self):
        """Tax report has correct structure."""
        result = apply_tax_rules({"entity_type": "LLC", "gross_receipts": 100000}, "new hampshire")
        assert "region" in result
        assert "entity_type" in result
        assert "gross_receipts" in result
        assert "taxes_due" in result
        assert isinstance(result["taxes_due"], list)


class TestAILinking:
    def test_link_crypto_payout(self):
        """Crypto payouts should be flagged for blockchain audit."""
        result = link_w8ben_to_payout("Cloud Services LLC", "Crypto", 1500.00)
        assert result["status"] == "linked"
        assert result["requires_blockchain_audit"] is True
        assert result["w8ben_document_id"].startswith("W8BEN_")

    def test_link_paypal_no_blockchain(self):
        """PayPal payouts should NOT require blockchain audit."""
        result = link_w8ben_to_payout("John Doe", "PayPal", 450.00)
        assert result["status"] == "linked"
        assert result["requires_blockchain_audit"] is False

    def test_link_confidence_score(self):
        """Linked results should have a confidence score."""
        result = link_w8ben_to_payout("Jane Smith", "Xoom", 2200.00)
        assert "confidence_score" in result
        assert 0 <= result["confidence_score"] <= 1.0

    def test_link_deterministic_id(self):
        """Same name should produce the same W8BEN ID."""
        r1 = link_w8ben_to_payout("Test Person", "PayPal", 100)
        r2 = link_w8ben_to_payout("Test Person", "Xoom", 200)
        assert r1["w8ben_document_id"] == r2["w8ben_document_id"]

    def test_link_ethereum_requires_audit(self):
        """Ethereum payments require blockchain audit."""
        result = link_w8ben_to_payout("ETH Contractor", "ethereum", 3000.00)
        assert result["requires_blockchain_audit"] is True

    def test_link_solana_requires_audit(self):
        """Solana payments require blockchain audit."""
        result = link_w8ben_to_payout("SOL Contractor", "solana", 1000.00)
        assert result["requires_blockchain_audit"] is True
