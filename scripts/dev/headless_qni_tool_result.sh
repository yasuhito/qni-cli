#!/usr/bin/env bash
set -euo pipefail

terminal=${1:-ghostty}
output_prefix=${2:-/tmp/qni-tool-result-${terminal}}
project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
temp_root=$(mktemp -d)

case "$terminal" in
  ghostty | kitty) ;;
  *)
    echo "usage: $0 [ghostty|kitty] [output-prefix]" >&2
    exit 2
    ;;
esac

cleanup() {
  rm -rf "$temp_root"
}
trap cleanup EXIT

mkdir -p "$temp_root/agent" "$temp_root/config/qni-cli" "$(dirname "$output_prefix")"
printf '{"path":"image"}\n' >"$temp_root/config/qni-cli/qni-math.json"
cd "$project_root"
npm run build >/dev/null
cp scripts/dev/qni_tool_result_session.jsonl "$temp_root/session.jsonl"

pi_runner="$temp_root/run-pi.sh"
cat >"$pi_runner" <<EOF
#!/usr/bin/env bash
exec env PI_CODING_AGENT_DIR="$temp_root/agent" XDG_CONFIG_HOME="$temp_root/config" \
  PI_OFFLINE=1 COLORFGBG='15;0' pi --approve --offline --session "$temp_root/session.jsonl" \
  --no-builtin-tools --tools qni --no-context-files --no-skills --no-prompt-templates \
  --no-themes --extension "$project_root/dist/qni-math/index.js" --use-theme dark
EOF
chmod +x "$pi_runner"

export QNI_MATH_TERMINAL="$terminal"
export QNI_MATH_RUNNER="$pi_runner"
export QNI_MATH_PTY_CONTROL="$temp_root/control.fifo"
export QNI_MATH_PTY_BRIDGE="$project_root/scripts/dev/pty_control.py"
export QNI_MATH_COLLAPSED=$(realpath -m "${output_prefix}-collapsed.png")
export QNI_MATH_EXPANDED=$(realpath -m "${output_prefix}-expanded.png")

xvfb-run -a -s "-screen 0 1200x700x24 +extension GLX +render" bash -c '
  set -euo pipefail
  export LIBGL_ALWAYS_SOFTWARE=1 GDK_BACKEND=x11
  unset WAYLAND_DISPLAY

  if [[ "$QNI_MATH_TERMINAL" == ghostty ]]; then
    ghostty --config-default-files=false --gtk-single-instance=false \
      --confirm-close-surface=false --background="#202020" --foreground="#eeeeee" \
      -e env QNI_PTY_CONTROL_FIFO="$QNI_MATH_PTY_CONTROL" \
      python3 "$QNI_MATH_PTY_BRIDGE" "$QNI_MATH_RUNNER" &
  else
    kitty -o linux_display_server=x11 --detach=no -o background="#202020" \
      -o foreground="#eeeeee" -e env QNI_PTY_CONTROL_FIFO="$QNI_MATH_PTY_CONTROL" \
      python3 "$QNI_MATH_PTY_BRIDGE" "$QNI_MATH_RUNNER" &
  fi
  terminal_pid=$!

  for _ in {1..70}; do
    [[ -p "$QNI_MATH_PTY_CONTROL" ]] && break
    sleep 0.1
  done
  sleep 7
  import -display "$DISPLAY" -window root "$QNI_MATH_COLLAPSED"
  printf "\017" >"$QNI_MATH_PTY_CONTROL"
  sleep 3
  import -display "$DISPLAY" -window root "$QNI_MATH_EXPANDED"
  kill "$terminal_pid" 2>/dev/null || true
  wait "$terminal_pid" 2>/dev/null || true
'

test -s "${output_prefix}-collapsed.png"
test -s "${output_prefix}-expanded.png"
printf '%s\n%s\n' "${output_prefix}-collapsed.png" "${output_prefix}-expanded.png"
