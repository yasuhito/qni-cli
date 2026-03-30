#!/usr/bin/env python3

import json
import math
import re
import sys
from dataclasses import dataclass

from sympy import Float, I, Integer, Matrix, Symbol, cos, exp, latex, pi, simplify, sin, sqrt

SUPPORTED_QUBIT_MESSAGE = "symbolic run currently supports only 1-qubit and 2-qubit circuits"
EPSILON = sys.float_info.epsilon
ANGLED_GATE_PATTERN = re.compile(r"\A(?P<gate>P|Rx|Ry|Rz)\((?P<angle>.+)\)\Z")
IDENTIFIER_PATTERN = re.compile(r"\A[a-zA-Z_][a-zA-Z0-9_]*\Z")
SIGNED_IDENTIFIER_PATTERN = re.compile(r"\A(?P<sign>[+-])(?P<identifier>[a-zA-Z_][a-zA-Z0-9_]*)\Z")
NUMERIC_PATTERN = re.compile(r"\A[+-]?\d+(?:\.\d+)?\Z")
MULTIPLIED_PATTERN = re.compile(r"\A(?P<coefficient>[+-]?\d+(?:\.\d+)?)\*(?P<term>.+)\Z")
PI_PATTERN = re.compile(
    r"\A(?P<sign>[+-]?)(?:(?P<coefficient>\d+(?:\.\d+)?)(?:\*)?)?(?:π|pi)(?:(?:/|_)(?P<denominator>\d+(?:\.\d+)?))?\Z"
)


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

    sign = -1.0 if match.group("sign") == "-" else 1.0
    coefficient = float(match.group("coefficient") or "1")
    denominator = float(match.group("denominator") or "1")
    symbolic = sign * coefficient * pi / denominator
    concrete = sign * coefficient * math.pi / denominator
    return symbolic, concrete


def parse_angle(raw_value: str, variables: dict[str, str]) -> ParsedAngle:
    normalized = str(raw_value).replace(" ", "")

    signed_identifier = SIGNED_IDENTIFIER_PATTERN.match(normalized)
    if signed_identifier:
        sign = -1.0 if signed_identifier.group("sign") == "-" else 1.0
        resolved_identifier = signed_identifier.group("identifier")
        resolved_term = parse_angle(resolved_identifier, variables)
        symbolic = sign * resolved_term.symbolic
        concrete = None if resolved_term.concrete is None else sign * resolved_term.concrete
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


def symbolic_initial_state_for_qubits(circuit, qubits, variables):
    if "initial_state" not in circuit:
        return Matrix([1, 0]) if qubits == 1 else Matrix([1, 0, 0, 0])

    if qubits != 1:
        raise ValueError("initial state currently supports only 1 qubit")

    state = [Integer(0), Integer(0)]
    for term in initial_state_terms(circuit):
        basis = int(term["basis"])
        state[basis] = parse_angle(term["coefficient"], variables).symbolic
    return Matrix(state)


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

    angle = parse_angle(match.group("angle"), variables)
    if angle.unresolved:
        return None

    phi = angle.concrete
    half = phi / 2.0

    if match.group("gate") == "P":
        return ((1.0, 0.0), (0.0, complex(math.cos(phi), math.sin(phi))))
    if match.group("gate") == "Rx":
        sine = math.sin(half)
        cosine = math.cos(half)
        return ((cosine, -1j * sine), (-1j * sine, cosine))
    if match.group("gate") == "Ry":
        sine = math.sin(half)
        cosine = math.cos(half)
        return ((cosine, -sine), (sine, cosine))
    if match.group("gate") == "Rz":
        return (
            (complex(math.cos(half), -math.sin(half)), 0.0),
            (0.0, complex(math.cos(half), math.sin(half))),
        )

    raise ValueError(f"unsupported gate for symbolic run: {gate!r}")


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
        terms.append(f"{simplified}|{basis}>")

    return join_terms(terms)


def render_named_basis_term(amplitude, label):
    simplified = simplify(amplitude)
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


def single_qubit_gate_matrix(gate, variables):
    gate_matrix = symbolic_gate(gate, variables)
    if gate_matrix.shape != (2, 2):
        raise ValueError(f"unsupported gate for symbolic run: {gate!r}")
    return gate_matrix


def two_qubit_gate_matrix(col, variables):
    left_gate, right_gate = col

    if left_gate == 1 and right_gate == 1:
        return identity_matrix(4)

    if left_gate == 1:
        return tensor_product(identity_matrix(2), single_qubit_gate_matrix(right_gate, variables))

    if right_gate == 1:
        return tensor_product(single_qubit_gate_matrix(left_gate, variables), identity_matrix(2))

    if left_gate in ("●", "•") and right_gate == "X":
        return controlled_x_matrix()

    if left_gate in ("●", "•") and right_gate == "Z":
        return controlled_z_matrix()

    raise ValueError(f"unsupported 2-qubit symbolic gate column: {col!r}")


def render_symbolic_state_for_qubits(state, qubits: int):
    terms = []
    for basis, amplitude in enumerate(state):
        simplified = simplify(amplitude)
        if simplified == 0:
            continue
        terms.append(f"{simplified}|{basis_label(basis, qubits)}>")

    return join_terms(terms)


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

    if qubits == 2:
        for col in cols:
            symbolic_state = two_qubit_gate_matrix(col, variables) * symbolic_state
        return symbolic_state

    for col in cols:
        symbolic_state = symbolic_gate(col[0], variables) * symbolic_state

    return symbolic_state


def run(circuit, output_format="text", basis=None):
    qubits = circuit.get("qubits")
    if qubits not in (1, 2):
        raise ValueError(SUPPORTED_QUBIT_MESSAGE)

    cols = circuit.get("cols", [])
    variables = circuit.get("variables", {})

    if basis == "x":
        if qubits != 1:
            raise ValueError("symbolic x-basis run currently supports only 1-qubit circuits")
        if output_format != "text":
            raise ValueError("symbolic basis display currently supports only text output")

        symbolic_state = symbolic_state_for_qubits(circuit, qubits, variables)
        return render_symbolic_state_x_basis(symbolic_state)

    if basis is not None:
        raise ValueError(f"unsupported symbolic basis: {basis}")

    if output_format == "latex":
        symbolic_state = symbolic_state_for_qubits(circuit, qubits, variables)
        return render_symbolic_state_latex_for_qubits(symbolic_state, qubits)

    if "initial_state" in circuit:
        symbolic_state = symbolic_state_for_qubits(circuit, qubits, variables)
        if qubits == 2:
            return render_symbolic_state_for_qubits(symbolic_state, 2)

        return render_symbolic_state(symbolic_state)

    if qubits == 2:
        symbolic_state = symbolic_state_for_qubits(circuit, qubits, variables)
        return render_symbolic_state_for_qubits(symbolic_state, 2)

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
