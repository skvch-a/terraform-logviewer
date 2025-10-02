def fix_log_sequence(log_entries: list[dict]) -> tuple[list[dict], int]:
    """
    Fix log sequence by filling in missing levels and timestamps.
    
    Returns:
        tuple: (fixed_logs, count_of_fixed_entries)
    """
    result = []
    prev_timestamp = None
    fixed_count = 0

    for entry in log_entries:
        got_level = entry.get("@level")
        got_timestamp = entry.get("@timestamp")
        msg = entry.get("@message", "").lower()
        entry_fixed = False

        if got_level is None:
            # content heuristic
            if "error" in msg:
                entry['@level'] = "error"
                entry_fixed = True
            elif "warning" in msg:
                entry['@level'] = "warning"
                entry_fixed = True

        if got_timestamp is None:
            if prev_timestamp:
                entry['@timestamp'] = prev_timestamp
                entry_fixed = True
            else:
                # content heuristic
                pass
        else:
            prev_timestamp = got_timestamp
        
        if entry_fixed:
            fixed_count += 1
        result.append(entry)

    return result, fixed_count
