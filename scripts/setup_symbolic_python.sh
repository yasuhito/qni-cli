#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
venv_dir="${repo_root}/.python-symbolic"
venv_python="${venv_dir}/bin/python"
sympy_version="1.14.0"
matplotlib_version="3.10.8"
pillow_version="12.1.1"
mpl_config_dir="${repo_root}/.python-symbolic/matplotlib-cache"

mkdir -p "${mpl_config_dir}"

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

if ! MPLCONFIGDIR="${mpl_config_dir}" "${venv_python}" - <<PY
import matplotlib
import PIL
raise SystemExit(0 if matplotlib.__version__ == "${matplotlib_version}" and PIL.__version__ == "${pillow_version}" else 1)
PY
then
  MPLCONFIGDIR="${mpl_config_dir}" "${venv_python}" -m pip install "matplotlib==${matplotlib_version}" "pillow==${pillow_version}"
fi

"${venv_python}" - <<'PY'
import sympy
print(sympy.__version__)
PY
