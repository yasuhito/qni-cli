"""Restricted JSON interpreter. No string expression parser or submitted code."""
import json
import re
import sys
import resource

resource.setrlimit(resource.RLIMIT_CPU, (12, 12))
resource.setrlimit(resource.RLIMIT_AS, (768 * 1024 * 1024, 768 * 1024 * 1024))
import sympy as s

if s.__version__ != '1.14.0':
    raise RuntimeError('symbolic grading requires SymPy 1.14.0')

PROTOCOL = "neutral-symbolic-circuit-json-v1"


class InvalidTaskReference(Exception):
    pass


def obj(value, keys):
    if not isinstance(value, dict) or set(value) != set(keys):
        raise ValueError("unexpected JSON keys")
    return value


def integer(value):
    if not isinstance(value, str) or not re.fullmatch(r"-?(0|[1-9][0-9]{0,31})", value):
        raise ValueError("exact integer string required")
    return int(value)


class Interpreter:
    def __init__(self, declarations):
        self.symbols = {}
        self.nodes = 0
        if not isinstance(declarations, list) or not 1 <= len(declarations) <= 8:
            raise ValueError("1..8 parameter declarations required")
        for declaration in declarations:
            obj(declaration, ["name", "real", "domain"])
            name = declaration["name"]
            if not isinstance(name, str) or not re.fullmatch(r"[a-z][a-z0-9_]{0,31}", name) or name in self.symbols:
                raise ValueError("invalid or duplicate parameter")
            if declaration["real"] is not True or declaration["domain"] != "real":
                raise ValueError("PA parameters must explicitly declare real domain")
            self.symbols[name] = s.Symbol(name, real=True)

    def expr(self, value, depth=0):
        self.nodes += 1
        if depth > 16 or self.nodes > 2048:
            raise ValueError("expression resource limit")
        if not isinstance(value, dict) or len(value) != 1:
            raise ValueError("expression must be a single-key AST object")
        kind, arg = next(iter(value.items()))
        if kind == "rational":
            if not isinstance(arg, list) or len(arg) != 2:
                raise ValueError("rational requires numerator and denominator")
            numerator, denominator = map(integer, arg)
            if denominator <= 0:
                raise ValueError("positive denominator required")
            result = s.Rational(numerator, denominator)
            return result, result, result
        if kind == "pi" and arg is True:
            return s.pi, s.pi, s.pi
        if kind == "parameter" and isinstance(arg, str) and arg in self.symbols:
            return self.symbols[arg], -s.oo, s.oo
        if kind in ("add", "mul"):
            if not isinstance(arg, list) or not 2 <= len(arg) <= 8:
                raise ValueError("add/mul require 2..8 arguments")
            parts = [self.expr(item, depth + 1) for item in arg]
            result = (s.Add if kind == "add" else s.Mul)(*(part[0] for part in parts))
            if kind == "add":
                return result, sum(part[1] for part in parts), sum(part[2] for part in parts)
            lo, hi = s.Integer(1), s.Integer(1)
            for _, a, b in parts:
                if any(x in (s.oo, -s.oo) for x in (lo, hi, a, b)):
                    lo, hi = -s.oo, s.oo
                else:
                    bounds = [lo*a, lo*b, hi*a, hi*b]
                    lo, hi = s.Min(*bounds), s.Max(*bounds)
            return result, lo, hi
        if kind == "neg":
            result, lo, hi = self.expr(arg, depth + 1)
            return -result, -hi, -lo
        if kind in ("sin", "cos", "sqrt", "asin", "acos", "atan"):
            result, lo, hi = self.expr(arg, depth + 1)
            if kind == "sqrt":
                if lo.is_nonnegative is not True:
                    raise ValueError("sqrt domain not proved nonnegative for all parameters")
                return s.sqrt(result), s.sqrt(lo), s.sqrt(hi)
            if kind in ("asin", "acos"):
                if (lo+1).is_nonnegative is not True or (1-hi).is_nonnegative is not True:
                    raise ValueError("inverse trig domain not proved within [-1,1]")
                function = getattr(s, kind)
                a, b = function(lo), function(hi)
                return function(result), s.Min(a, b), s.Max(a, b)
            if kind == "atan":
                return s.atan(result), -s.pi/2, s.pi/2
            return getattr(s, kind)(result), s.Integer(-1), s.Integer(1)
        raise ValueError("unsupported expression node or undeclared parameter")

    def circuit(self, circuit, qubits, allowed):
        obj(circuit, ["operations"])
        operations = circuit["operations"]
        if not isinstance(operations, list) or len(operations) > 64:
            raise ValueError("at most 64 operations")
        result = s.eye(2**qubits)
        for operation in operations:
            if not isinstance(operation, dict):
                raise ValueError("operation must be an object")
            gate = operation.get("gate")
            if gate not in allowed:
                raise ValueError("gate is not allowed")
            controlled = gate in ("CRx", "CRy", "CRz", "CH", "CNOT")
            base = {"CRx": "Rx", "CRy": "Ry", "CRz": "Rz", "CH": "H", "CNOT": "X"}.get(gate, gate)
            angled = base in ("Rx", "Ry", "Rz", "P", "GlobalPhase")
            keys = ["gate", "targets"] + (["controls"] if controlled else []) + (["angle"] if angled else [])
            obj(operation, keys)
            targets = operation["targets"]
            controls = operation.get("controls", [])
            indices = targets + controls if isinstance(targets, list) and isinstance(controls, list) else []
            if len(targets) != 1 or len(controls) != int(controlled) or any(type(i) is not int or not 0 <= i < qubits for i in indices) or len(set(indices)) != len(indices):
                raise ValueError("invalid targets/controls for fixed width")
            angle = self.expr(operation["angle"])[0] if angled else None
            c, t = (s.cos(angle/2), s.sin(angle/2)) if angled else (None, None)
            matrix = {
                "X": s.Matrix([[0, 1], [1, 0]]),
                "Y": s.Matrix([[0, -s.I], [s.I, 0]]),
                "Z": s.diag(1, -1),
                "H": s.Matrix([[1, 1], [1, -1]])/s.sqrt(2),
                "S": s.diag(1, s.I),
                "T": s.diag(1, s.exp(s.I*s.pi/4)),
            }.get(base)
            if base == "Rx": matrix = s.Matrix([[c, -s.I*t], [-s.I*t, c]])
            if base == "Ry": matrix = s.Matrix([[c, -t], [t, c]])
            if base == "Rz": matrix = s.diag(s.exp(-s.I*angle/2), s.exp(s.I*angle/2))
            if base == "P": matrix = s.diag(1, s.exp(s.I*angle))
            if base == "GlobalPhase": matrix = s.eye(2)*s.exp(-s.I*angle/2)
            if matrix is None:
                raise ValueError("unsupported gate")
            expanded = s.zeros(2**qubits)
            mask = 1 << (qubits-1-targets[0])
            for column in range(2**qubits):
                if any(not column & (1 << (qubits-1-control)) for control in controls):
                    expanded[column, column] = 1
                else:
                    bit = int(bool(column & mask))
                    for output in (0, 1):
                        row = (column & ~mask) | (output*mask)
                        expanded[row, column] = matrix[output, bit]
            result = expanded*result
        return result


def main():
    request = json.load(sys.stdin)
    specification = request["specification"]
    submission = request["submission"]
    try:
        reference_interpreter = Interpreter(specification["parameters"])
        reference = reference_interpreter.circuit(specification["reference"], specification["qubits"], request["allowedGates"])
    except Exception as error:
        raise InvalidTaskReference("invalid symbolic task reference") from error
    obj(submission, ["protocol", "qubits", "parameters", "operations"])
    if submission["protocol"] != PROTOCOL or type(submission["qubits"]) is not int or submission["qubits"] != specification["qubits"] or submission["parameters"] != specification["parameters"]:
        raise ValueError("protocol, fixed width or parameter declarations mismatch")
    interpreter = Interpreter(submission["parameters"])
    actual = interpreter.circuit({"operations": submission["operations"]}, specification["qubits"], request["allowedGates"])
    if specification["mode"] == "state":
        reference, actual = reference[:, 0], actual[:, 0]
        if specification["up_to_global_phase"]:
            difference = actual*actual.conjugate().T-reference*reference.conjugate().T
        else:
            difference = actual-reference
    elif specification["up_to_global_phase"]:
        product = actual*reference.conjugate().T
        difference = product-s.eye(product.rows)*product[0, 0]
    else:
        difference = actual-reference
    for index, entry in enumerate(difference):
        # Only exact symbolic zero is accepted. No equals(), sampling or floats.
        if s.simplify(s.trigsimp(entry)) != 0:
            return {"verdict": "unproven", "reason": "exact identity not established", "entry": index}
    return {"verdict": "proved", "reason": "all exact symbolic residuals are zero"}


try:
    result = main()
except InvalidTaskReference:
    raise
except Exception as error:
    # Submitted data or an unsupported simplification cannot be a proof.
    result = {"verdict": "unproven", "reason": str(error)[:512]}
print(json.dumps(result))
