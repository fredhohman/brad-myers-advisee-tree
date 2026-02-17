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
from collections import Counter


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

    # Strip trailing punctuation (.,;)
    text = text.rstrip(".,;:").strip()

    return text


def match_depth(prev_id, indent_len):
    candidates = [0]
    for c in prev_id.split("."):
        candidates.append(candidates[-1] + 2 + len(c))

    depth = candidates.index(indent_len)
    return depth


def parse_markdown(md_file, csv_file):
    rows = []
    stack = []
    prev_id = "0"

    with open(md_file, "r", encoding="utf-8") as f:
        lines = f.readlines()

    pattern = re.compile(r"^(\s*)(\d+)\.\s+(.*)$")

    for line in lines:
        match = pattern.match(line)
        if not match:
            continue

        indent, number, content = match.groups()
        indent_len = len(indent)
        depth = match_depth(prev_id, indent_len)

        if depth == 0:
            stack = [number]
        else:
            stack = stack[:depth] + [number]
        full_id = ".".join(stack)
        prev_id = full_id

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

    # Build children dictionary to track parent-child relationships
    children = {"0": []}  # Initialize with Brad Myers as root
    for row in rows:
        row_id = row["id"]
        parent_id = row["parent_id"]

        # Initialize children list for this node if not exists
        if row_id not in children:
            children[row_id] = []

        # Add this node to its parent's children list
        if parent_id not in children:
            children[parent_id] = []
        children[parent_id].append(row_id)

    # Recursive function to count all descendants
    def count_descendants(node_id):
        """Count all descendants (children, grandchildren, etc.) of a node"""
        total = 0
        if node_id in children:
            for child_id in children[node_id]:
                total += 1  # Count the direct child
                total += count_descendants(child_id)  # Count all their descendants
        return total

    # Add descendant counts to each row
    for row in rows:
        row_id = row["id"]
        row["direct_students"] = len(children.get(row_id, []))
        row["total_descendants"] = count_descendants(row_id)

    # Calculate counts for Brad Myers (root node)
    brad_direct = len(children["0"])
    brad_total = count_descendants("0")

    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "name", "parent", "parent_id", "direct_students", "total_descendants"])
        writer.writeheader()
        writer.writerow(
            {"id": "0", "name": "Brad Myers", "parent": "", "parent_id": "", "direct_students": brad_direct, "total_descendants": brad_total}
        )  # Add root
        writer.writerows(rows)

    unique_names = len(set(row["name"] for row in rows))
    print(f"Parsed {len(rows)} entries ({unique_names} unique) (+ root) into {csv_file}")

    # Calculate generation statistics
    generation_counts = Counter()
    max_generation = 0

    for row in rows:
        # Generation is the number of dots in the ID + 1 (for Brad Myers's direct advisees)
        # e.g., "1" = generation 2, "1.1" = generation 3, "1.1.1" = generation 4
        generation = row["id"].count(".") + 2  # +2 because Brad Myers is gen 1, his advisees are gen 2
        generation_counts[generation] += 1
        max_generation = max(max_generation, generation)

    print(f"\nGeneration breakdown (Brad Myers = generation 1):")
    for gen in range(1, max_generation + 1):
        if gen == 1:
            print(f"  Gen {gen}: 1 (Brad Myers)")
        else:
            print(f"  Gen {gen}: {generation_counts[gen]}")

    print(f"\nTotal generations: {max_generation}")

    # Print descendant statistics
    print(f"\nDescendant counts for Brad Myers:")
    print(f"  Direct students: {brad_direct}")
    print(f"  Total descendants: {brad_total}")

    # Find people with most descendants
    rows_with_descendants = [r for r in rows if r["total_descendants"] > 0]
    if rows_with_descendants:
        top_advisors = sorted(rows_with_descendants, key=lambda r: r["total_descendants"], reverse=True)[:5]
        print(f"\nTop 5 advisors by total descendants:")
        for i, row in enumerate(top_advisors, 1):
            print(f"  {i}. {row['name']}: {row['direct_students']} direct, {row['total_descendants']} total")

    # Find and print duplicates
    name_counts = Counter(row["name"] for row in rows)
    duplicates = {name: count for name, count in name_counts.items() if count > 1}

    if duplicates:
        print(f"\nFound {len(duplicates)} duplicate names:")
        for name, count in sorted(duplicates.items()):
            print(f"  - {name} (appears {count} times)")


if __name__ == "__main__":
    parse_markdown("Brad Myers advisee tree.md", "data.csv")
