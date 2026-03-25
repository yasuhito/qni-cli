#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
venv_dir="${repo_root}/.python-symbolic"
venv_python="${venv_dir}/bin/python"

if [[ ! -x "${venv_python}" ]]; then
  python3 -m venv "${venv_dir}"
fi

"${venv_python}" -m pip install --upgrade pip sympy
"${venv_python}" - <<'PY'
import sympy
print(sympy.__version__)
PY
