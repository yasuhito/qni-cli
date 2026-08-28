#!/usr/bin/env bash
set -euo pipefail

terminal=${1:-ghostty}
output_prefix=${2:-/tmp/qni-math-${terminal}-streaming}
project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
temp_root=$(mktemp -d)
phase_file="$temp_root/phase"
mid_output="${output_prefix}-closed.png"
complete_output="${output_prefix}-complete.png"

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

mkdir -p "$temp_root/agent" "$(dirname "$mid_output")" "$(dirname "$complete_output")"
cd "$project_root"
npm run build >/dev/null

runner="$temp_root/run-pi.sh"
cat >"$runner" <<EOF
#!/usr/bin/env bash
exec env PI_CODING_AGENT_DIR="$temp_root/agent" PI_OFFLINE=1 COLORFGBG="15;0" \
  QNI_MATH_FIXTURE_PHASE_FILE="$phase_file" \
  pi --approve --offline --no-session --no-tools \
  --no-context-files --no-skills --no-prompt-templates --no-themes \
  --provider qni-math-fixture --model streaming \
  --extension "$project_root/dist/qni-math/index.js" \
  --extension "$project_root/scripts/dev/qni_math_fixed_provider.ts" \
  --use-theme dark "Bell 状態を説明してください。"
EOF
chmod +x "$runner"

export QNI_MATH_TERMINAL="$terminal"
export QNI_MATH_RUNNER="$runner"
export QNI_MATH_PHASE_FILE="$phase_file"
export QNI_MATH_MID_OUTPUT=$(realpath -m "$mid_output")
export QNI_MATH_COMPLETE_OUTPUT=$(realpath -m "$complete_output")

xvfb-run -a -s "-screen 0 1200x700x24 +extension GLX +render" bash -c '
  set -euo pipefail
  export LIBGL_ALWAYS_SOFTWARE=1 GDK_BACKEND=x11
  unset WAYLAND_DISPLAY

  if [[ "$QNI_MATH_TERMINAL" == ghostty ]]; then
    ghostty --config-default-files=false --gtk-single-instance=false \
      --confirm-close-surface=false --background="#202020" --foreground="#eeeeee" \
      -e "$QNI_MATH_RUNNER" &
  else
    kitty -o linux_display_server=x11 --detach=no \
      -o background="#202020" -o foreground="#eeeeee" \
      -e "$QNI_MATH_RUNNER" &
  fi
  terminal_pid=$!

  wait_for_phase() {
    local expected=$1
    for _ in $(seq 1 200); do
      [[ -f "$QNI_MATH_PHASE_FILE" ]] && [[ $(<"$QNI_MATH_PHASE_FILE") == "$expected" ]] && return
      sleep 0.1
    done
    echo "timed out waiting for fixture phase: $expected" >&2
    return 1
  }

  wait_for_phase closed
  sleep 0.5
  import -display "$DISPLAY" -window root "$QNI_MATH_MID_OUTPUT"
  wait_for_phase done
  sleep 0.5
  import -display "$DISPLAY" -window root "$QNI_MATH_COMPLETE_OUTPUT"

  kill "$terminal_pid" 2>/dev/null || true
  wait "$terminal_pid" 2>/dev/null || true
'

test -s "$mid_output"
test -s "$complete_output"
printf '%s\n%s\n' "$mid_output" "$complete_output"
