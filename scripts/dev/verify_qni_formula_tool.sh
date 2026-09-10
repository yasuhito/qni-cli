#!/usr/bin/env bash
set -Eeuo pipefail

terminal=${1:-ghostty}
output=${2:-"/tmp/qni-formula-tool-${terminal}.png"}
project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
temp_root=$(mktemp -d)

case "$terminal" in
  ghostty | kitty) ;;
  *)
    echo "usage: $0 [ghostty|kitty] [output.png]" >&2
    exit 2
    ;;
esac

cleanup() {
  rm -rf "$temp_root"
}
trap cleanup EXIT

mkdir -p "$temp_root/agent" "$temp_root/config" "$(dirname "$output")"
session="$temp_root/session.jsonl"
runner="$temp_root/run-pi.sh"
output=$(realpath -m "$output")

cat >"$runner" <<EOF
#!/usr/bin/env bash
exec env PI_CODING_AGENT_DIR="$temp_root/agent" XDG_CONFIG_HOME="$temp_root/config" \\
  PI_OFFLINE=1 pi --approve --offline --session "$session" \\
  --provider qni-formula-fixture --model tool --thinking off \\
  --no-extensions --extension "$project_root/scripts/dev/qni_formula_tool_provider.ts" \\
  --extension "$project_root/dist/qni-tools/index.js" \\
  --no-builtin-tools --tools qni --no-context-files --no-skills --no-prompt-templates \\
  --no-themes 'Bell 状態を作り、LaTeX の状態ベクトルを表示してください。'
EOF
chmod +x "$runner"

cd "$project_root"
npm run build >/dev/null

tool_result_ready() {
  node - "$QNI_FORMULA_SESSION" <<'NODE'
const fs = require("node:fs");
const session = process.argv[2];
if (!fs.existsSync(session)) process.exit(1);
const records = fs.readFileSync(session, "utf8").trim().split("\n").map(JSON.parse);
const result = records.map((record) => record.message).findLast((message) =>
  message?.role === "toolResult" && message.toolName === "qni"
);
const expected = "\\frac{\\sqrt{2}}{2}\\ket{00} + \\frac{\\sqrt{2}}{2}\\ket{11}\n";
const latex = result?.details?.commands?.find(({ args }) =>
  Array.isArray(args) && args.join("\u0000") === "run\u0000--latex"
)?.latex;
if (result?.isError !== false || latex !== expected) process.exit(1);
if (!result.content?.some((item) => item.type === "text" && item.text.includes(expected))) process.exit(1);
NODE
}

export QNI_FORMULA_TERMINAL="$terminal"
export QNI_FORMULA_RUNNER="$runner"
export QNI_FORMULA_OUTPUT="$output"
export QNI_FORMULA_SESSION="$session"
export QNI_FORMULA_TOOL_READY="$(declare -f tool_result_ready)"
xvfb-run -a -s "-screen 0 1200x700x24 +extension GLX +render" bash -c '
  set -euo pipefail
  export LIBGL_ALWAYS_SOFTWARE=1 GDK_BACKEND=x11
  unset WAYLAND_DISPLAY

  if [[ "$QNI_FORMULA_TERMINAL" == ghostty ]]; then
    ghostty --config-default-files=false --gtk-single-instance=false \
      --confirm-close-surface=false -e "$QNI_FORMULA_RUNNER" &
  else
    kitty -o linux_display_server=x11 -o confirm_os_window_close=0 \
      -e "$QNI_FORMULA_RUNNER" &
  fi
  terminal_pid=$!
  eval "$QNI_FORMULA_TOOL_READY"
  for _ in {1..30}; do
    if tool_result_ready; then break; fi
    sleep 1
  done
  tool_result_ready
  import -display "$DISPLAY" -window root "$QNI_FORMULA_OUTPUT"
  kill "$terminal_pid" 2>/dev/null || true
  wait "$terminal_pid" 2>/dev/null || true
'

test -s "$output"
tool_result_ready
printf '%s\n' "$output"
