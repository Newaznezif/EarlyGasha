def normalize_value(value):
    """
    Strict ML preparation filter.
    Converts API-specific fill values and empty indicators to standard Python None (null).
    """
    if value in [-999.0, -999, "-999.0", "-999", "NA", "N/A", "null", "None", "", [], {}]:
        return None
    return value

def clean_payload(payload: dict) -> dict:
    """
    Recursively applies the ML-safe normalization rule across a unified dataset schema.
    """
    normalized_payload = {}
    for key, val in payload.items():
        if isinstance(val, dict):
            normalized_payload[key] = clean_payload(val)
        elif isinstance(val, list):
            # Normalizing items in a list if any
            clean_list = [normalize_value(item) for item in val]
            normalized_payload[key] = [i for i in clean_list if i is not None] if clean_list else []
        else:
            normalized_payload[key] = normalize_value(val)
            
    return normalized_payload
