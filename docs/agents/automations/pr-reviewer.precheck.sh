cd /home/yasuhito/Work/qni-cli && python3 - <<'PY'
import json
import subprocess
import sys

AUTOMATION_IDS = (
    "1c20e813-8150-4f46-a44a-46cea275af4c",
    "b467ad1d-295a-4146-ab47-b1fe2636ddc3",
)


def cleanup_finished_automation_tabs():
    try:
        terminals_payload = json.loads(
            subprocess.check_output(["orca-ide", "terminal", "list", "--json"], text=True)
        )
        terminals = (terminals_payload.get("result") or {}).get("terminals") or []
        finished_tab_ids = set()
        for automation_id in AUTOMATION_IDS:
            runs_payload = json.loads(
                subprocess.check_output(
                    ["orca-ide", "automations", "runs", "--id", automation_id, "--json"],
                    text=True,
                )
            )
            for run in (runs_payload.get("result") or {}).get("runs") or []:
                if run.get("status") not in {"completed", "failed", "cancelled", "timed_out"}:
                    continue
                tab_id = run.get("terminalSessionId")
                if tab_id:
                    finished_tab_ids.add(tab_id)
    except (OSError, subprocess.CalledProcessError, json.JSONDecodeError):
        return

    for terminal in terminals:
        if terminal.get("tabId") not in finished_tab_ids:
            continue
        handle = terminal.get("handle")
        if not handle:
            continue
        subprocess.run(
            ["orca-ide", "terminal", "close", "--terminal", handle, "--tab", "--json"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )


cleanup_finished_automation_tabs()

repo = "yasuhito/qni-cli"


def gh_json(*args):
    return json.loads(subprocess.check_output(["gh", *args], text=True))

prs = gh_json(
    "pr", "list", "-R", repo, "--state", "open", "--label", "agent:review", "--limit", "100",
    "--json", "number,isDraft,labels,statusCheckRollup,comments,reviewRequests"
)

def clear_stale_reviewing(prs):
    """run が異常終了して agent:reviewing が残ると、その PR が恒久的に skip され
    依存 issue も止まるため、付与から 45 分以上経過した agent:reviewing を
    自己修復として外す（2026-08-31 に pi-formula の PR #20 でデッドロックが起きた）。"""
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc)
    for pr in prs:
        if "agent:reviewing" not in {label["name"] for label in pr.get("labels", [])}:
            continue
        try:
            events = gh_json("api", f"repos/{repo}/issues/{pr['number']}/timeline", "--paginate")
        except subprocess.CalledProcessError:
            continue
        applied = None
        for event in events:
            if event.get("event") == "labeled" and (event.get("label") or {}).get("name") == "agent:reviewing":
                applied = event.get("created_at")
        if not applied:
            continue
        applied_at = datetime.datetime.fromisoformat(applied.replace("Z", "+00:00"))
        if (now - applied_at).total_seconds() < 45 * 60:
            continue
        subprocess.run(
            ["gh", "pr", "edit", str(pr["number"]), "-R", repo, "--remove-label", "agent:reviewing"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False,
        )
        pr["labels"] = [label for label in pr.get("labels", []) if label["name"] != "agent:reviewing"]


clear_stale_reviewing(prs)

blocked_labels = {"agent:reviewing", "ready-for-human", "agent:blocked"}
for pr in prs:
    labels = {label["name"] for label in pr.get("labels", [])}
    if labels & blocked_labels:
        continue
    if pr.get("isDraft"):
        sys.exit(0)

    requests = pr.get("reviewRequests") or []
    copilot_requested = False
    for request in requests:
        login = (request.get("login") or (request.get("requestedReviewer") or {}).get("login") or "").lower()
        if "copilot" in login:
            copilot_requested = True
            break
    if copilot_requested:
        continue

    checks = pr.get("statusCheckRollup") or []
    check_pending = False
    for check in checks:
        status = (check.get("status") or check.get("state") or "").upper()
        if status in {"QUEUED", "IN_PROGRESS", "PENDING", "EXPECTED", "WAITING"}:
            check_pending = True
            break
    if check_pending:
        continue

    coderabbit_processing = False
    for comment in pr.get("comments") or []:
        author = ((comment.get("author") or {}).get("login") or "").lower()
        if author != "coderabbitai":
            continue
        body = (comment.get("body") or "").lower()
        if "currently processing" in body or "review in progress" in body:
            coderabbit_processing = True
            break
    if coderabbit_processing:
        continue

    sys.exit(0)

sys.exit(1)
PY
