def apply_tax_rules(entity_data: dict, region: str):
    """
    The deterministic Rules Engine. Applies specific tax code constraints mathematically.
    """
    entity_type = entity_data.get("entity_type", "Individual")
    gross_receipts = entity_data.get("gross_receipts", 0)
    
    report = {
        "region": region,
        "entity_type": entity_type,
        "gross_receipts": gross_receipts,
        "taxes_due": []
    }
    
    if region.lower() == "new hampshire":
        # New Hampshire: No general sales/income tax.
        # Has BPT (Business Profits Tax) and BET (Business Enterprise Tax) for biz thresholds
        if entity_type in ["LLC", "S-Corp", "C-Corp", "Sole Proprietorship"]:
            # BET threshold is roughly $250k
            if gross_receipts > 250000:
                report["taxes_due"].append({
                    "tax_type": "Business Enterprise Tax (BET)",
                    "amount_estimated": gross_receipts * 0.0055, # 0.55% approx
                    "form_required": "NH BET"
                })
            
            # BPT threshold is roughly $103k
            if gross_receipts > 103000:
                report["taxes_due"].append({
                    "tax_type": "Business Profits Tax (BPT)",
                    "amount_estimated": (gross_receipts * 0.10) * 0.075, # 7.5% on taxable profits
                    "form_required": "NH-1120 / NH-1040"
                })
        else:
            report["note"] = "Individuals in NH generally do not pay state income tax."
            
    elif region.lower() == "cavite":
        # Cavite, Philippines (BIR rules apply)
        if entity_type == "Individual":
            report["taxes_due"].append({
                "tax_type": "Percentage Tax / Income Tax",
                "form_required": "BIR Form 1701Q",
                "note": "Subject to graduated income tax rates or 8% gross receipt tax if eligible."
            })
            
    return report
