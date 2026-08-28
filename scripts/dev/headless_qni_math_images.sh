#!/usr/bin/env bash
set -euo pipefail

terminal=${1:-ghostty}
theme=${2:-dark}
output=${3:-/tmp/qni-math-${terminal}-${theme}.png}
mode=${4:-auto}
project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
temp_root=$(mktemp -d)

case "$terminal:$theme:$mode" in
  ghostty:dark:auto | ghostty:light:auto | kitty:dark:auto | kitty:light:auto | ghostty:dark:text | ghostty:light:text | kitty:dark:text | kitty:light:text) ;;
  *)
    echo "usage: $0 [ghostty|kitty] [dark|light] [output.png] [auto|text]" >&2
    exit 2
    ;;
esac

cleanup() {
  rm -rf "$temp_root"
}
trap cleanup EXIT

mkdir -p "$temp_root/agent" "$(dirname "$output")"
cd "$project_root"
npm run build >/dev/null
cp scripts/dev/qni_math_session.jsonl "$temp_root/session.jsonl"

if [[ "$theme" == light ]]; then
  colorfgbg='0;15'
else
  colorfgbg='15;0'
fi

runner="$temp_root/run-pi.sh"
cat >"$runner" <<EOF
#!/usr/bin/env bash
extra=()
if [[ "$mode" == text ]]; then
  extra=("/math text")
fi
exec env PI_CODING_AGENT_DIR="$temp_root/agent" PI_OFFLINE=1 COLORFGBG="$colorfgbg" \
  pi --approve --offline --session "$temp_root/session.jsonl" --no-tools \
  --no-context-files --no-skills --no-prompt-templates --no-themes \
  --extension "$project_root/dist/qni-math/index.js" --use-theme "$theme" "\${extra[@]}"
EOF
chmod +x "$runner"

if [[ "$theme" == light ]]; then
  background='#ffffff'
  foreground='#202020'
else
  background='#202020'
  foreground='#eeeeee'
fi

export QNI_MATH_TERMINAL="$terminal"
export QNI_MATH_RUNNER="$runner"
export QNI_MATH_OUTPUT=$(realpath -m "$output")
export QNI_MATH_BACKGROUND="$background"
export QNI_MATH_FOREGROUND="$foreground"
export QNI_MATH_MODE="$mode"

xvfb-run -a -s "-screen 0 1200x700x24 +extension GLX +render" bash -c '
  set -euo pipefail
  export LIBGL_ALWAYS_SOFTWARE=1 GDK_BACKEND=x11
  unset WAYLAND_DISPLAY

  if [[ "$QNI_MATH_TERMINAL" == ghostty ]]; then
    ghostty --config-default-files=false --gtk-single-instance=false \
      --confirm-close-surface=false --background="$QNI_MATH_BACKGROUND" \
      --foreground="$QNI_MATH_FOREGROUND" -e "$QNI_MATH_RUNNER" &
  else
    kitty -o linux_display_server=x11 --detach=no \
      -o "background=$QNI_MATH_BACKGROUND" -o "foreground=$QNI_MATH_FOREGROUND" \
      -e "$QNI_MATH_RUNNER" &
  fi
  terminal_pid=$!

  sleep 7
  import -display "$DISPLAY" -window root "$QNI_MATH_OUTPUT"
  kill "$terminal_pid" 2>/dev/null || true
  wait "$terminal_pid" 2>/dev/null || true
'

test -s "$output"
echo "$output"
