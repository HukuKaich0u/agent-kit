#!/usr/bin/env python3
"""Build data/aws-icon-index.json from the official AWS icon assets.

Sources:
  assets/aws/                — official AWS Architecture Icons (SVG only,
                               Release 22-2025.07.31)
  data/shape-index.json.gz   — draw.io shape index (mxgraph.aws4 styles)

Output entry kinds:
  service  — Architecture-Service-Icons (the 78x78 resourceIcon set); carries
             the matching mxgraph.aws4 style, or null when the icon has no
             aws4 counterpart (embed the official SVG instead)
  resource — Resource-Icons (48px variants; best-effort aws4 match)
  group    — official group frames (verified against the current
             mxgraph.aws4 palette; consumed by validate.py as the
             source of truth for frame-color checks)

Usage: python3 build_aws_index.py        # writes data/aws-icon-index.json
"""
import gzip
import json
import os
import re

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS = os.path.join(ROOT, "assets", "aws")
SHAPE_INDEX = os.path.join(ROOT, "data", "shape-index.json.gz")
OUT = os.path.join(ROOT, "data", "aws-icon-index.json")


def norm(s):
    s = s.lower()
    s = re.sub(r"^(amazon|aws)[-_ ]+", "", s)
    return re.sub(r"[^a-z0-9]", "", s)


# normalized official name -> aws4 resIcon token, for the 28 official names
# whose normalized form does not equal the aws4 title (verified 2026-07-10
# against shape-index.json.gz). None = no aws4 counterpart: embed the SVG.
OVERRIDES = {
    "costandusagereport": "mxgraph.aws4.cost_and_usage_report",
    "elementalconductor": None,
    "elementaldelta": None,
    "elementallive": None,
    "elementalserver": None,
    "iamidentitycenter": "mxgraph.aws4.single_sign_on",
    "identityandaccessmanagement": "mxgraph.aws4.identity_and_access_management",
    "iotanalytics": "mxgraph.aws4.iot_analytics",
    "iotbutton": "mxgraph.aws4.iot_button",
    "iotcore": "mxgraph.aws4.iot_core",
    "iotdevicedefender": "mxgraph.aws4.iot_device_defender",
    "iotdevicemanagement": "mxgraph.aws4.iot_device_management",
    "iotevents": "mxgraph.aws4.iot_events",
    "iotexpresslink": "mxgraph.aws4.iot_expresslink",
    "iotfleetwise": "mxgraph.aws4.iot_fleetwise",
    "iotgreengrass": "mxgraph.aws4.greengrass",
    "iotsitewise": "mxgraph.aws4.iot_sitewise",
    "iottwinmaker": "mxgraph.aws4.iot_twinmaker",
    "marketplacedark": "mxgraph.aws4.marketplace",
    "marketplacelight": "mxgraph.aws4.marketplace",
    "appstream2": "mxgraph.aws4.appstream_20",
    "augmentedaia2i": "mxgraph.aws4.augmented_ai",
    "efs": "mxgraph.aws4.elastic_file_system",
    "fsxforwfs": "mxgraph.aws4.fsx_for_windows_file_server",
    "gameliftservers": "mxgraph.aws4.gamelift_2",
    "pinpointapis": "mxgraph.aws4.pinpoint",
    "simplestorageservice": "mxgraph.aws4.s3",
    "simplestorageserviceglacier": "mxgraph.aws4.glacier",
    "workdocssdk": None,
}

# Curated official short forms (guideline: short forms are allowed once the
# full name has appeared). Keys are normalized official names.
EXTRA_ALIASES = {
    "simplestorageservice": ["S3"],
    "simplestorageserviceglacier": ["S3 Glacier", "Glacier"],
    "identityandaccessmanagement": ["IAM"],
    "iamidentitycenter": ["SSO", "Identity Center"],
    "simplequeueservice": ["SQS"],
    "simplenotificationservice": ["SNS"],
    "simpleemailservice": ["SES"],
    "elastickubernetesservice": ["EKS"],
    "elasticcontainerservice": ["ECS"],
    "elasticcontainerregistry": ["ECR"],
    "relationaldatabaseservice": ["RDS"],
    "elasticloadbalancing": ["ELB"],
    "elasticblockstore": ["EBS"],
    "keymanagementservice": ["KMS"],
    "virtualprivatecloud": ["VPC"],
}

# Official group frames, current mxgraph.aws4 palette (dumped from
# shape-index.json.gz 2026-07-10 + guideline deck slide 25).
# "Security group" is the one row not present in the bundled shape-index;
# its colors follow the draw.io palette and are re-verified live.
GROUPS = [
    # (name, grIcon, strokeColor, fontColor, fillColor, dashed)
    ("AWS Cloud", "mxgraph.aws4.group_aws_cloud_alt", "#232F3E", "#232F3E", "none", 0),
    ("AWS Cloud (logo)", "mxgraph.aws4.group_aws_cloud", "#232F3E", "#232F3E", "none", 0),
    ("Region", "mxgraph.aws4.group_region", "#00A4A6", "#147EBA", "none", 1),
    ("Availability Zone", "mxgraph.aws4.group_availability_zone", "#545B64", "#545B64", "none", 1),
    ("VPC", "mxgraph.aws4.group_vpc2", "#8C4FFF", "#AAB7B8", "none", 0),
    ("Public subnet", "mxgraph.aws4.group_security_group", "#7AA116", "#248814", "#F2F6E8", 0),
    ("Private subnet", "mxgraph.aws4.group_security_group", "#00A4A6", "#147EBA", "#E6F6F7", 0),
    ("Security group", "mxgraph.aws4.group_security_group", "#DD3522", "#DD3522", "none", 0),
    ("Auto Scaling group", "mxgraph.aws4.group_auto_scaling_group", "#D86613", "#D86613", "none", 1),
    ("Server contents", "mxgraph.aws4.group_on_premise", "#7D8998", "#5A6C86", "none", 0),
    ("Corporate data center", "mxgraph.aws4.group_corporate_data_center", "#7D8998", "#5A6C86", "none", 0),
    ("EC2 instance contents", "mxgraph.aws4.group_ec2_instance_contents", "#D86613", "#D86613", "none", 0),
    ("Spot Fleet", "mxgraph.aws4.group_spot_fleet", "#D86613", "#D86613", "none", 0),
    ("AWS account", "mxgraph.aws4.group_account", "#CD2264", "#CD2264", "none", 0),
    ("IoT Greengrass Deployment", "mxgraph.aws4.group_iot_greengrass_deployment", "#7AA116", "#3F8624", "none", 0),
    ("IoT Greengrass", "mxgraph.aws4.group_iot_greengrass", "#7AA116", "#3F8624", "none", 0),
    ("Elastic Beanstalk container", "mxgraph.aws4.group_elastic_beanstalk", "#D86613", "#D86613", "none", 0),
    ("Step Functions workflow", "mxgraph.aws4.group_aws_step_functions_workflow", "#CD2264", "#CD2264", "none", 0),
]


def aws4_maps():
    """resIcon token -> (style, title); normalized aws4 title -> token."""
    with gzip.open(SHAPE_INDEX, "rt", encoding="utf-8") as f:
        shapes = json.load(f)
    by_token, token_by_title = {}, {}
    for s in shapes:
        st = s.get("style", "")
        m = re.search(r"resIcon=(mxgraph\.aws4\.[a-z0-9_]+)", st)
        if not m:
            continue
        tok = m.group(1)
        by_token.setdefault(tok, (st, s.get("title", "")))
        token_by_title.setdefault(norm(s.get("title", "")), tok)
    return by_token, token_by_title


def svg_color(path):
    """First fill that isn't white/black — the category color of an icon."""
    try:
        txt = open(path, encoding="utf-8", errors="ignore").read()
    except OSError:
        return None
    for c in re.findall(r"#[0-9A-Fa-f]{6}", txt):
        if c.upper() not in ("#FFFFFF", "#000000"):
            return c.upper()
    return None


def walk_icons(subdir, pattern):
    """Yield (category_folder, filename, raw_name, abs_path)."""
    root = os.path.join(ASSETS, subdir)
    for cat in sorted(os.listdir(root)):
        cdir = os.path.join(root, cat)
        if not os.path.isdir(cdir):
            continue
        for f in sorted(os.listdir(cdir)):
            m = re.match(pattern, f)
            if m:
                yield cat, f, m.group(1), os.path.join(cdir, f)


def main():
    by_token, token_by_title = aws4_maps()
    entries, unmatched = [], []

    def add(kind, cat_prefix, cat, fname, raw, path, track_unmatched):
        key = norm(raw)
        tok = OVERRIDES[key] if key in OVERRIDES else token_by_title.get(key)
        style, title = by_token.get(tok, (None, None)) if tok else (None, None)
        if tok and style is None:
            unmatched.append((raw, tok))
        elif style is None and track_unmatched and key not in OVERRIDES:
            unmatched.append((raw, None))
        aliases = list(EXTRA_ALIASES.get(key, []))
        if title and norm(title) != key and title not in aliases:
            aliases.append(title)
        entries.append({
            "kind": kind,
            "name": raw.replace("-", " ").replace("_", " "),
            "aliases": aliases,
            "category": cat.replace(cat_prefix, "").replace("-", " "),
            "official_color": svg_color(path),
            "aws4_style": style,
            "svg": os.path.relpath(path, ROOT).replace(os.sep, "/"),
        })

    for cat, f, raw, path in walk_icons("service", r"Arch_(.+)_64\.svg$"):
        add("service", "Arch_", cat, f, raw, path, track_unmatched=True)
    for cat, f, raw, path in walk_icons("resource", r"Res_(.+)_48\.svg$"):
        add("resource", "Res_", cat, f, raw, path, track_unmatched=False)
    for name, gricon, stroke, font, fill, dashed in GROUPS:
        entries.append({
            "kind": "group", "name": name, "aliases": [], "grIcon": gricon,
            "strokeColor": stroke, "fontColor": font, "fillColor": fill,
            "dashed": dashed,
        })

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=1)

    n_svc = sum(1 for e in entries if e["kind"] == "service")
    n_hit = sum(1 for e in entries if e["kind"] == "service" and e["aws4_style"])
    n_res = sum(1 for e in entries if e["kind"] == "resource")
    n_grp = sum(1 for e in entries if e["kind"] == "group")
    print(f"service {n_svc} (aws4 matched {n_hit}), resource {n_res}, "
          f"group {n_grp} -> {OUT}")
    for raw, tok in unmatched:
        suffix = f" (override token {tok} not in shape-index)" if tok else ""
        print(f"  unmatched: {raw}{suffix}")


if __name__ == "__main__":
    main()
