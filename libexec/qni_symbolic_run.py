#!/usr/bin/env python3

import json
import math
import re
import sys
from dataclasses import dataclass

from sympy import Float, I, Integer, Matrix, Symbol, cos, exp, latex, pi, simplify, sin, sqrt

EPSILON = sys.float_info.epsilon
ANGLED_GATE_PATTERN = re.compile(r"\A(?P<gate>P|Rx|Ry|Rz)\((?P<angle>.+)\)\Z")
IDENTIFIER_PATTERN = re.compile(r"\A[a-zA-Z_][a-zA-Z0-9_]*\Z")
SIGNED_IDENTIFIER_PATTERN = re.compile(r"\A(?P<sign>[+-])(?P<identifier>[a-zA-Z_][a-zA-Z0-9_]*)\Z")
NUMERIC_PATTERN = re.compile(r"\A[+-]?\d+(?:\.\d+)?\Z")
IMAGINARY_NUMERIC_PATTERN = re.compile(r"\A(?P<real>[+-]?\d+(?:\.\d+)?)i\Z")
MULTIPLIED_PATTERN = re.compile(r"\A(?P<coefficient>[+-]?\d+(?:\.\d+)?)\*(?P<term>.+)\Z")
PI_PATTERN = re.compile(
    r"\A(?P<sign>[+-]?)(?:(?P<coefficient>\d+(?:\.\d+)?)(?:\*)?)?(?:π|pi)(?:(?:/|_)(?P<denominator>\d+(?:\.\d+)?))?\Z"
)
BELL_BASIS_COMPONENTS = {
    "Φ+": ((0, Integer(1)), (3, Integer(1))),
    "Φ-": ((0, Integer(1)), (3, Integer(-1))),
    "Ψ+": ((1, Integer(1)), (2, Integer(1))),
    "Ψ-": ((1, Integer(1)), (2, Integer(-1))),
}


@dataclass
class ParsedAngle:
    symbolic: object
    concrete: float | None
    unresolved: bool


def normalize_scalar(value: float) -> float:
    if abs(value) < EPSILON:
        return 0.0

    nearest_integer = round(value)
    if abs(value - nearest_integer) <= EPSILON:
        return float(nearest_integer)

    return value


def format_numeric_amplitude(amplitude: complex | float) -> str:
    if isinstance(amplitude, complex):
        real = normalize_scalar(amplitude.real)
        imag = normalize_scalar(amplitude.imag)

        if imag == 0.0:
          return str(real)
        if real == 0.0:
          return f"{imag}i"

        prefix = "+" if imag > 0 else ""
        return f"{real}{prefix}{imag}i"

    return str(normalize_scalar(float(amplitude)))


def symbolic_scalar(value: str):
    number = float(value)
    return Integer(int(number)) if number.is_integer() else Float(number)


def parse_pi_term(value: str) -> tuple[object, float] | None:
    match = PI_PATTERN.match(value)
    if not match:
        return None

    symbolic_sign = Integer(-1) if match.group("sign") == "-" else Integer(1)
    concrete_sign = -1.0 if match.group("sign") == "-" else 1.0
    coefficient_text = match.group("coefficient") or "1"
    denominator_text = match.group("denominator") or "1"
    coefficient = float(coefficient_text)
    denominator = float(denominator_text)
    symbolic = symbolic_sign * symbolic_scalar(coefficient_text) * pi / symbolic_scalar(denominator_text)
    concrete = concrete_sign * coefficient * math.pi / denominator
    return symbolic, concrete


def parse_angle(raw_value: str, variables: dict[str, str]) -> ParsedAngle:
    normalized = str(raw_value).replace(" ", "")

    signed_identifier = SIGNED_IDENTIFIER_PATTERN.match(normalized)
    if signed_identifier:
        symbolic_sign = Integer(-1) if signed_identifier.group("sign") == "-" else Integer(1)
        concrete_sign = -1.0 if signed_identifier.group("sign") == "-" else 1.0
        resolved_identifier = signed_identifier.group("identifier")
        resolved_term = parse_angle(resolved_identifier, variables)
        symbolic = symbolic_sign * resolved_term.symbolic
        concrete = None if resolved_term.concrete is None else concrete_sign * resolved_term.concrete
        return ParsedAngle(symbolic=symbolic, concrete=concrete, unresolved=resolved_term.unresolved)

    resolved = variables.get(normalized, normalized)

    if NUMERIC_PATTERN.match(resolved):
        value = float(resolved)
        return ParsedAngle(symbolic=value, concrete=value, unresolved=False)

    pi_term = parse_pi_term(resolved)
    if pi_term:
        symbolic, concrete = pi_term
        return ParsedAngle(symbolic=symbolic, concrete=concrete, unresolved=False)

    if IDENTIFIER_PATTERN.match(resolved):
        return ParsedAngle(symbolic=Symbol(resolved), concrete=None, unresolved=True)

    multiplied = MULTIPLIED_PATTERN.match(resolved)
    if multiplied:
        coefficient = float(multiplied.group("coefficient"))
        symbolic_coefficient = symbolic_scalar(multiplied.group("coefficient"))
        term = parse_angle(multiplied.group("term"), variables)
        symbolic = symbolic_coefficient * term.symbolic
        concrete = None if term.concrete is None else coefficient * term.concrete
        return ParsedAngle(symbolic=symbolic, concrete=concrete, unresolved=term.unresolved)

    raise ValueError(f"invalid angle: {resolved}")


def initial_state_terms(circuit):
    return circuit.get("initial_state", {}).get("terms", [])


def parse_state_coefficient(raw_value: str, variables: dict[str, str]):
    normalized = str(raw_value).replace(" ", "")
    imaginary_numeric = IMAGINARY_NUMERIC_PATTERN.match(normalized)
    if imaginary_numeric:
        return I * symbolic_scalar(imaginary_numeric.group("real"))

    return parse_angle(normalized, variables).symbolic


def symbolic_initial_state_for_qubits(circuit, qubits, variables):
    if "initial_state" not in circuit:
        return Matrix([Integer(1), *([Integer(0)] * ((2**qubits) - 1))])

    state = [Integer(0)] * (2**qubits)
    for term in initial_state_terms(circuit):
        coefficient = parse_state_coefficient(term["coefficient"], variables)
        for basis_index, scale in basis_components(term["basis"], qubits):
            state[basis_index] += coefficient * scale / bell_basis_scale(term["basis"])
    return Matrix(state)


def basis_components(basis: str, qubits: int):
    if qubits == 1:
        return ((int(basis), Integer(1)),)

    if re.fullmatch(rf"[01]{{{qubits}}}", basis):
        return ((int(basis, 2), Integer(1)),)

    if basis in BELL_BASIS_COMPONENTS:
        return BELL_BASIS_COMPONENTS[basis]

    raise ValueError(f"unsupported initial state basis: {basis}")


def bell_basis_scale(basis: str):
    return sqrt(2) if basis in BELL_BASIS_COMPONENTS else Integer(1)


def numeric_gate(gate, variables):
    if gate == 1:
        return None
    if gate == "H":
        return None
    if gate == "X":
        return ((0.0, 1.0), (1.0, 0.0))
    if gate == "Y":
        return ((0.0, -1j), (1j, 0.0))
    if gate == "Z":
        return ((1.0, 0.0), (0.0, -1.0))
    if gate == "S":
        return ((1.0, 0.0), (0.0, 1j))
    if gate == "S†":
        return ((1.0, 0.0), (0.0, -1j))
    if gate == "T":
        return ((1.0, 0.0), (0.0, complex(math.cos(math.pi / 4), math.sin(math.pi / 4))))
    if gate == "T†":
        return ((1.0, 0.0), (0.0, complex(math.cos(math.pi / 4), -math.sin(math.pi / 4))))
    if gate == "√X":
        return (((1.0 + 1j) / 2, (1.0 - 1j) / 2), ((1.0 - 1j) / 2, (1.0 + 1j) / 2))

    match = ANGLED_GATE_PATTERN.match(str(gate))
    if not match:
        raise ValueError(f"unsupported gate for symbolic run: {gate!r}")

    # Keep angled gates on the exact SymPy path even when the angle resolves
    # to a concrete value such as π/2. This preserves symbolic output.
    return None


def symbolic_gate(gate, variables):
    if gate == 1:
        return Matrix([[1, 0], [0, 1]])
    if gate == "H":
        scale = sqrt(2) / 2
        return Matrix([[scale, scale], [scale, -scale]])
    if gate == "X":
        return Matrix([[0, 1], [1, 0]])
    if gate == "Y":
        return Matrix([[0, -I], [I, 0]])
    if gate == "Z":
        return Matrix([[1, 0], [0, -1]])
    if gate == "S":
        return Matrix([[1, 0], [0, I]])
    if gate == "S†":
        return Matrix([[1, 0], [0, -I]])
    if gate == "T":
        return Matrix([[1, 0], [0, exp(I * pi / 4)]])
    if gate == "T†":
        return Matrix([[1, 0], [0, exp(-I * pi / 4)]])
    if gate == "√X":
        return Matrix([[1 + I, 1 - I], [1 - I, 1 + I]]) / 2

    match = ANGLED_GATE_PATTERN.match(str(gate))
    if not match:
        raise ValueError(f"unsupported gate for symbolic run: {gate!r}")

    angle = parse_angle(match.group("angle"), variables).symbolic
    gate_name = match.group("gate")

    if gate_name == "P":
        return Matrix([[1, 0], [0, exp(I * angle)]])
    if gate_name == "Rx":
        return Matrix([[cos(angle / 2), -I * sin(angle / 2)], [-I * sin(angle / 2), cos(angle / 2)]])
    if gate_name == "Ry":
        return Matrix([[cos(angle / 2), -sin(angle / 2)], [sin(angle / 2), cos(angle / 2)]])
    if gate_name == "Rz":
        return Matrix([[exp(-I * angle / 2), 0], [0, exp(I * angle / 2)]])

    raise ValueError(f"unsupported gate for symbolic run: {gate!r}")


def apply_numeric_gate(state, gate_matrix):
    if gate_matrix is None:
        return state

    return [
        gate_matrix[0][0] * state[0] + gate_matrix[0][1] * state[1],
        gate_matrix[1][0] * state[0] + gate_matrix[1][1] * state[1],
    ]


def render_numeric_state(state):
    terms = []
    for basis, amplitude in enumerate(state):
        if isinstance(amplitude, complex):
            if normalize_scalar(amplitude.real) == 0.0 and normalize_scalar(amplitude.imag) == 0.0:
                continue
        elif normalize_scalar(amplitude) == 0.0:
            continue

        terms.append(f"{format_numeric_amplitude(amplitude)}|{basis}>")

    return join_terms(terms)


def render_symbolic_state(state):
    terms = []
    for basis, amplitude in enumerate(state):
        simplified = simplify(amplitude)
        if simplified == 0:
            continue
        terms.append(f"{text_basis_amplitude(simplified)}|{basis}>")

    return join_terms(terms)


def render_named_basis_term(amplitude, label):
    simplified = simplify(amplitude)
    if getattr(simplified, "is_number", False):
        numeric = normalize_scalar(float(simplified.evalf()))
        if abs(numeric - 1.0) <= EPSILON:
            simplified = Integer(1)
        elif abs(numeric + 1.0) <= EPSILON:
            simplified = Integer(-1)
    if simplified == 0:
        return None
    if simplified == 1:
        return label
    if simplified == -1:
        return f"-{label}"

    return f"{simplified}{label}"


def render_symbolic_state_x_basis(state):
    zero = simplify(state[0])
    one = simplify(state[1])
    plus = simplify((zero + one) / sqrt(2))
    minus = simplify((zero - one) / sqrt(2))

    terms = []
    for amplitude, label in ((plus, "|+>"), (minus, "|->")):
        term = render_named_basis_term(amplitude, label)
        if term:
            terms.append(term)

    return join_terms(terms)


def render_symbolic_state_y_basis(state):
    zero = simplify(state[0])
    one = simplify(state[1])
    plus_i = simplify((zero - I * one) / sqrt(2))
    minus_i = simplify((zero + I * one) / sqrt(2))

    terms = []
    for amplitude, label in ((plus_i, "|+i>"), (minus_i, "|-i>")):
        term = render_named_basis_term(amplitude, label)
        if term:
            terms.append(term)

    return join_terms(terms)


def render_symbolic_state_bell_basis(state):
    zero_zero = simplify(state[0])
    zero_one = simplify(state[1])
    one_zero = simplify(state[2])
    one_one = simplify(state[3])

    phi_plus = simplify((zero_zero + one_one) / sqrt(2))
    phi_minus = simplify((zero_zero - one_one) / sqrt(2))
    psi_plus = simplify((zero_one + one_zero) / sqrt(2))
    psi_minus = simplify((zero_one - one_zero) / sqrt(2))

    terms = []
    for amplitude, label in (
        (phi_plus, "|Φ+>"),
        (phi_minus, "|Φ->"),
        (psi_plus, "|Ψ+>"),
        (psi_minus, "|Ψ->"),
    ):
        term = render_named_basis_term(amplitude, label)
        if term:
            terms.append(term)

    return join_terms(terms)


def join_terms(terms):
    if not terms:
        return "0"

    rendered = terms[0]
    for term in terms[1:]:
        if term.startswith("-"):
            rendered += f" - {term[1:]}"
        else:
            rendered += f" + {term}"
    return rendered


def join_latex_terms(terms):
    if not terms:
        return "0"

    first_sign, first_term = terms[0]
    rendered = f"- {first_term}" if first_sign == "-" else first_term

    for sign, term in terms[1:]:
        rendered += f" {sign} {term}"
    return rendered


def basis_label(basis: int, qubits: int) -> str:
    return format(basis, f"0{qubits}b")


def basis_latex_label(basis: int, qubits: int) -> str:
    return rf"\lvert {basis_label(basis, qubits)} \rangle"


def tensor_product(left, right):
    rows = []
    for left_row in range(left.rows):
        for right_row in range(right.rows):
            row = []
            for left_col in range(left.cols):
                for right_col in range(right.cols):
                    row.append(left[left_row, left_col] * right[right_row, right_col])
            rows.append(row)
    return Matrix(rows)


def tensor_product_many(matrices):
    result = Matrix([[1]])
    for matrix in matrices:
        result = tensor_product(result, matrix)
    return result


def identity_matrix(size: int) -> Matrix:
    return Matrix.eye(size)


def controlled_x_matrix():
    return Matrix(
        [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 1],
            [0, 0, 1, 0],
        ]
    )


def controlled_z_matrix():
    return Matrix(
        [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, -1],
        ]
    )


def basis_bit(index: int, qubit: int, qubits: int) -> int:
    shift = qubits - qubit - 1
    return (index >> shift) & 1


def replace_basis_bit(index: int, qubit: int, qubits: int, value: int) -> int:
    shift = qubits - qubit - 1
    mask = 1 << shift
    if value:
        return index | mask
    return index & ~mask


def single_qubit_gate_matrix(gate, variables):
    gate_matrix = symbolic_gate(gate, variables)
    if gate_matrix.shape != (2, 2):
        raise ValueError(f"unsupported gate for symbolic run: {gate!r}")
    return gate_matrix


def controlled_gate_matrix(qubits: int, controls, target: int, target_gate: Matrix):
    size = 2**qubits
    matrix = Matrix.zeros(size, size)

    for basis_index in range(size):
        if not all(basis_bit(basis_index, control, qubits) == 1 for control in controls):
            matrix[basis_index, basis_index] = 1
            continue

        target_basis = basis_bit(basis_index, target, qubits)
        for output_basis in range(2):
            amplitude = target_gate[output_basis, target_basis]
            if amplitude == 0:
                continue
            output_index = replace_basis_bit(basis_index, target, qubits, output_basis)
            matrix[output_index, basis_index] = amplitude

    return matrix


def column_gate_matrix(col, qubits, variables):
    if len(col) != qubits:
        raise ValueError(f"gate column width {len(col)} does not match qubit count {qubits}")

    controls = [index for index, gate in enumerate(col) if gate in ("●", "•")]
    non_identity = [(index, gate) for index, gate in enumerate(col) if gate != 1 and gate not in ("●", "•")]

    if not controls:
        matrices = [
            identity_matrix(2) if gate == 1 else single_qubit_gate_matrix(gate, variables)
            for gate in col
        ]
        return tensor_product_many(matrices)

    if len(non_identity) != 1:
        raise ValueError(f"unsupported symbolic gate column: {col!r}")

    target, target_gate = non_identity[0]
    if target_gate not in ("X", "Z"):
        raise ValueError(f"unsupported symbolic gate column: {col!r}")

    return controlled_gate_matrix(
        qubits,
        controls,
        target,
        single_qubit_gate_matrix(target_gate, variables),
    )


def plain_single_qubit_gate(gate):
    return gate not in (1, "●", "•")


def render_symbolic_state_for_qubits(state, qubits: int):
    terms = []
    for basis, amplitude in enumerate(state):
        simplified = simplify(amplitude)
        if simplified == 0:
            continue

        basis_text = f"|{basis_label(basis, qubits)}>"
        if simplified == 1:
            terms.append(basis_text)
            continue
        if simplified == -1:
            terms.append(f"-{basis_text}")
            continue

        terms.append(f"{text_basis_amplitude(simplified)}{basis_text}")

    return join_terms(terms)


def text_basis_amplitude(amplitude):
    return f"({amplitude})" if getattr(amplitude, "is_Add", False) else str(amplitude)


def latex_term(amplitude, basis, qubits):
    sign = "-"
    if amplitude.could_extract_minus_sign():
        amplitude = -amplitude
    else:
        sign = "+"

    basis_term = basis_latex_label(basis, qubits)
    if amplitude == 1:
        return sign, basis_term

    return sign, rf"{latex(amplitude)} {basis_term}"


def render_symbolic_state_latex_for_qubits(state, qubits: int):
    terms = []
    for basis, amplitude in enumerate(state):
        simplified = simplify(amplitude)
        if simplified == 0:
            continue
        terms.append(latex_term(simplified, basis, qubits))

    return join_latex_terms(terms)


def symbolic_state_for_qubits(circuit, qubits, variables):
    cols = circuit.get("cols", [])
    symbolic_state = symbolic_initial_state_for_qubits(circuit, qubits, variables)

    for col in cols:
        symbolic_state = column_gate_matrix(col, qubits, variables) * symbolic_state

    return symbolic_state


def run(circuit, output_format="text", basis=None):
    qubits = circuit.get("qubits")

    cols = circuit.get("cols", [])
    variables = circuit.get("variables", {})

    if basis == "x":
        if qubits != 1:
            raise ValueError("symbolic x-basis run currently supports only 1-qubit circuits")
        if output_format != "text":
            raise ValueError("symbolic basis display currently supports only text output")

        symbolic_state = symbolic_state_for_qubits(circuit, qubits, variables)
        return render_symbolic_state_x_basis(symbolic_state)

    if basis == "y":
        if qubits != 1:
            raise ValueError("symbolic y-basis run currently supports only 1-qubit circuits")
        if output_format != "text":
            raise ValueError("symbolic basis display currently supports only text output")

        symbolic_state = symbolic_state_for_qubits(circuit, qubits, variables)
        return render_symbolic_state_y_basis(symbolic_state)

    if basis == "bell":
        if qubits != 2:
            raise ValueError("symbolic bell-basis run currently supports only 2-qubit circuits")
        if output_format != "text":
            raise ValueError("symbolic basis display currently supports only text output")

        symbolic_state = symbolic_state_for_qubits(circuit, qubits, variables)
        return render_symbolic_state_bell_basis(symbolic_state)

    if basis is not None:
        raise ValueError(f"unsupported symbolic basis: {basis}")

    if output_format == "latex":
        symbolic_state = symbolic_state_for_qubits(circuit, qubits, variables)
        return render_symbolic_state_latex_for_qubits(symbolic_state, qubits)

    if "initial_state" in circuit:
        symbolic_state = symbolic_state_for_qubits(circuit, qubits, variables)
        if qubits > 1:
            return render_symbolic_state_for_qubits(symbolic_state, qubits)

        return render_symbolic_state(symbolic_state)

    if qubits > 1:
        symbolic_state = symbolic_state_for_qubits(circuit, qubits, variables)
        return render_symbolic_state_for_qubits(symbolic_state, qubits)

    numeric_state = [1.0, 0.0]
    requires_symbolic = False

    for col in cols:
        gate = col[0]
        gate_matrix = numeric_gate(gate, variables)
        if gate_matrix is None:
            requires_symbolic = True
            break
        numeric_state = apply_numeric_gate(numeric_state, gate_matrix)

    if not requires_symbolic:
        return render_numeric_state(numeric_state)

    symbolic_state = symbolic_state_for_qubits(circuit, qubits, variables)

    return render_symbolic_state(symbolic_state)


def parse_args(argv):
    output_format = "text"
    basis = None
    index = 1

    while index < len(argv):
        if argv[index] == "--format" and index + 1 < len(argv):
            output_format = argv[index + 1]
            index += 2
            continue
        if argv[index] == "--basis" and index + 1 < len(argv):
            basis = argv[index + 1]
            index += 2
            continue

        raise ValueError("unsupported symbolic renderer arguments")

    if output_format not in {"text", "latex"}:
        raise ValueError("unsupported symbolic renderer arguments")

    return output_format, basis


def main():
    try:
        output_format, basis = parse_args(sys.argv)
        circuit = json.load(sys.stdin)
        print(run(circuit, output_format=output_format, basis=basis))
    except ValueError as e:
        print(str(e), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
