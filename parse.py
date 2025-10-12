"""
Usage:
1. Go to the shared Google Doc and download it as Markdown (.md).
   Save the file as raw.md in this folder.
2. Run:
      python parse.py
   This will parse raw.md and regenerate data.csv automatically.

The script extracts clean names, removes extra annotations
(e.g., "co-advised", "PhD ..."), and ensures consistent IDs.
"""

import re
import csv


def clean_name(content):
    # Extract name from [Name](url) if present
    link_match = re.match(r"\[([^\]]+)\]\([^)]+\)", content)
    if link_match:
        text = link_match.group(1).strip()
    else:
        text = content.strip()

    # Remove anything after a comma
    text = text.split(",")[0].strip()

    # Remove "(co-advised ...)" completely
    text = re.sub(r"\(.*co-?advised.*?\)", "", text, flags=re.IGNORECASE).strip()

    # If "PhD" appears (case-insensitive), keep only the part before it
    phd_match = re.search(r"\bPhD\b", text, flags=re.IGNORECASE)
    if phd_match:
        text = text[: phd_match.start()].strip()

    # --- Special hard fix for known duplicated case ---
    if "LiuMIchael" in text or "LiuMI" in text:
        text = "Michael Xieyang Liu"

    # Strip trailing punctuation (.,;)
    text = text.rstrip(".,;:").strip()

    return text


def parse_markdown(md_file, csv_file):
    rows = []
    stack = []

    with open(md_file, "r", encoding="utf-8") as f:
        lines = f.readlines()

    pattern = re.compile(r"^(\s*)(\d+)\.\s+(.*)$")

    for line in lines:
        match = pattern.match(line)
        if not match:
            continue

        indent, number, content = match.groups()
        depth = len(indent) // 3

        if depth == 0:
            stack = [number]
        else:
            stack = stack[:depth] + [number]
        full_id = ".".join(stack)

        if depth == 0:
            parent = "Brad Myers"
            parent_id = "0"
        else:
            parent_id = ".".join(stack[:-1])
            parent = None
            for r in reversed(rows):
                if r["id"] == parent_id:
                    parent = r["name"]
                    break

        name = clean_name(content)

        rows.append(
            {"id": full_id, "name": name, "parent": parent, "parent_id": parent_id}
        )

    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "name", "parent", "parent_id"])
        writer.writeheader()
        writer.writerow(
            {"id": "0", "name": "Brad Myers", "parent": "", "parent_id": ""}
        )  # Add root
        writer.writerows(rows)

    print(f"Parsed {len(rows)} unique entries (+ root) into {csv_file}")


if __name__ == "__main__":
    parse_markdown("raw.md", "data.csv")
