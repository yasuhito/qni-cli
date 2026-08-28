#!/usr/bin/env bash
set -euo pipefail

terminal=${1:-ghostty}
output=${2:-/tmp/qni-math-status-${terminal}.png}
project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
source_agent_dir=${PI_CODING_AGENT_DIR:-${HOME:?HOME is required}/.pi/agent}
package_version=$(node -e 'process.stdout.write(require(process.argv[1]).version)' "$project_root/package.json")
temp_root=$(mktemp -d)
tmux_socket="qni-math-$$"
tmux_session=qni-math-status

case "$terminal" in
  ghostty | kitty) ;;
  *)
    echo "usage: $0 [ghostty|kitty] [output.png]" >&2
    exit 2
    ;;
esac

cleanup() {
  tmux -L "$tmux_socket" kill-server 2>/dev/null || true
  rm -rf "$temp_root"
}
trap cleanup EXIT

mkdir -p "$temp_root/home" "$temp_root/agent" "$(dirname "$output")"
for file in auth.json models.json models-store.json; do
  if [[ -f "$source_agent_dir/$file" ]]; then
    cp "$source_agent_dir/$file" "$temp_root/agent/$file"
  fi
done
cd "$project_root"
npm run build >/dev/null
pack_json=$(npm pack --json --pack-destination "$temp_root")
tarball=$(node -e 'const data=JSON.parse(process.argv[1]); process.stdout.write(data[0].filename)' "$pack_json")
package_root="$temp_root/package"
mkdir "$package_root"
tar -xzf "$temp_root/$tarball" -C "$package_root" --strip-components=1
npm install --prefix "$package_root" --omit=dev >/dev/null

export HOME="$temp_root/home"
export PI_CODING_AGENT_DIR="$temp_root/agent"
export PI_OFFLINE=1
pi install "$package_root" >/dev/null
cp scripts/dev/qni_math_session.jsonl "$temp_root/session.jsonl"

runner="$temp_root/run-pi.sh"
cat >"$runner" <<EOF
#!/usr/bin/env bash
exec env HOME="$HOME" PI_CODING_AGENT_DIR="$PI_CODING_AGENT_DIR" PI_OFFLINE=1 \
  pi --approve --offline --session "$temp_root/session.jsonl" --no-tools --no-context-files --no-skills \
  --no-prompt-templates --no-themes --verbose
EOF
chmod +x "$runner"
tmux -L "$tmux_socket" new-session -d -x 120 -y 32 -s "$tmux_session" "$runner"

export QNI_MATH_TERMINAL="$terminal"
export QNI_MATH_VERSION="$package_version"
export QNI_MATH_OUTPUT=$(realpath -m "$output")
export QNI_MATH_TMUX_SOCKET="$tmux_socket"
export QNI_MATH_TMUX_SESSION="$tmux_session"
export QNI_MATH_PANE_TEXT="$temp_root/pane.txt"

xvfb-run -a -s "-screen 0 1200x700x24 +extension GLX +render" bash -c '
  set -euo pipefail
  export LIBGL_ALWAYS_SOFTWARE=1 GDK_BACKEND=x11
  unset WAYLAND_DISPLAY

  if [[ "$QNI_MATH_TERMINAL" == ghostty ]]; then
    ghostty --gtk-single-instance=false --confirm-close-surface=false \
      -e tmux -L "$QNI_MATH_TMUX_SOCKET" attach -t "$QNI_MATH_TMUX_SESSION" &
  else
    kitty -o linux_display_server=x11 --detach=no \
      -e tmux -L "$QNI_MATH_TMUX_SOCKET" attach -t "$QNI_MATH_TMUX_SESSION" &
  fi
  terminal_pid=$!

  sleep 5
  tmux -L "$QNI_MATH_TMUX_SOCKET" set-buffer "/math status"
  tmux -L "$QNI_MATH_TMUX_SOCKET" paste-buffer -t "$QNI_MATH_TMUX_SESSION"
  tmux -L "$QNI_MATH_TMUX_SOCKET" send-keys -t "$QNI_MATH_TMUX_SESSION" Enter
  sleep 1
  tmux -L "$QNI_MATH_TMUX_SOCKET" capture-pane -p -t "$QNI_MATH_TMUX_SESSION" >"$QNI_MATH_PANE_TEXT"
  import -display "$DISPLAY" -window root "$QNI_MATH_OUTPUT"
  kill "$terminal_pid" 2>/dev/null || true
  wait "$terminal_pid" 2>/dev/null || true
'

test -s "$output"
grep -F "qni-math $QNI_MATH_VERSION" "$QNI_MATH_PANE_TEXT" >/dev/null
grep -F "path: text" "$QNI_MATH_PANE_TEXT" >/dev/null
grep -F "reason: 環境変数 TMUX" "$QNI_MATH_PANE_TEXT" >/dev/null
echo "$output"
