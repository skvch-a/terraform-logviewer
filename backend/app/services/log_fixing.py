def fix_log_sequence(log_entries: list[dict]) -> list[dict]:
    result = []
    prev_timestamp = None

    for entry in log_entries:
        got_level = entry.get("@level")
        got_timestamp = entry.get("@timestamp")
        msg = entry.get("@message", "").lower()

        if got_level is None:
            # content heuristic
            if "error" in msg:
                entry['@level'] = "error"
            elif "warning" in msg:
                entry['@level'] = "warning"

        if got_timestamp is None:
            if prev_timestamp:
                entry['@timestamp'] = prev_timestamp
            else:
                # content heuristic
                pass
        else:
            prev_timestamp = got_timestamp
        result.append(entry)

    return result
