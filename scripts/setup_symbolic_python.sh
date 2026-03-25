#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
venv_dir="${repo_root}/.python-symbolic"
venv_python="${venv_dir}/bin/python"
sympy_version="1.14.0"

if [[ ! -x "${venv_python}" ]]; then
  python3 -m venv "${venv_dir}"
fi

if ! "${venv_python}" - <<PY
import sympy
raise SystemExit(0 if sympy.__version__ == "${sympy_version}" else 1)
PY
then
  "${venv_python}" -m pip install --upgrade pip "sympy==${sympy_version}"
fi

"${venv_python}" - <<'PY'
import sympy
print(sympy.__version__)
PY
