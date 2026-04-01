#!/usr/bin/env python3

import io
import json
import math
import sys

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.patches import Circle
from PIL import Image

CANVAS_HEIGHT_PX = 256
DPI = 100
OUTER_RADIUS = 1.0
OUTLINE_LINEWIDTH_PT = 2.2
INNER_COLOR = "#38bdf8"
ZERO_EPSILON = 1e-12


def main():
    payload = json.load(sys.stdin)
    render(payload)


def render(payload):
    qubits = payload["qubits"]
    amplitudes = payload["amplitudes"]
    theme = theme_config(payload.get("theme", "dark"))
    output_path = payload["output_path"]

    if qubits not in (1, 2):
        raise ValueError("circle notation currently supports only 1-qubit and 2-qubit circuits")

    width_px = 512 if qubits == 1 else 896
    figsize = (width_px / DPI, CANVAS_HEIGHT_PX / DPI)
    fig, ax = plt.subplots(figsize=figsize, dpi=DPI)
    fig.patch.set_alpha(0)
    ax.set_facecolor((0, 0, 0, 0))
    ax.set_axis_off()

    labels = basis_labels(qubits)
    x_positions = circle_x_positions(qubits)
    ax.set_xlim(min(x_positions) - 1.8, max(x_positions) + 1.8)
    ax.set_ylim(-1.9, 1.5)
    ax.set_aspect("equal")
    fig.canvas.draw()

    for x, label, amplitude in zip(x_positions, labels, amplitudes):
        draw_basis_circle(ax, x, 0.0, label, complex(amplitude["real"], amplitude["imag"]), theme)

    buffer = io.BytesIO()
    plt.savefig(buffer, format="png", transparent=True, bbox_inches="tight", pad_inches=0.12)
    plt.close(fig)
    buffer.seek(0)
    Image.open(buffer).convert("RGBA").save(output_path, format="PNG")


def basis_labels(qubits):
    if qubits == 1:
        return ["|0>", "|1>"]
    return ["|00>", "|01>", "|10>", "|11>"]


def circle_x_positions(qubits):
    if qubits == 1:
        return [-1.8, 1.8]
    return [-5.4, -1.8, 1.8, 5.4]


def half_linewidth_data(ax, linewidth_points):
    ax.figure.canvas.draw()
    linewidth_px = linewidth_points * ax.figure.dpi / 72.0
    origin = ax.transData.transform((0.0, 0.0))
    unit_x = ax.transData.transform((1.0, 0.0))
    pixels_per_data = unit_x[0] - origin[0]
    return (linewidth_px / pixels_per_data) / 2.0


def draw_basis_circle(ax, x, y, label, amplitude, theme):
    magnitude = abs(amplitude)
    phase = 0.0 if magnitude < ZERO_EPSILON else math.atan2(amplitude.imag, amplitude.real)

    outline_radius = OUTER_RADIUS + half_linewidth_data(ax, OUTLINE_LINEWIDTH_PT)
    outer = Circle((x, y), outline_radius, fill=False, linewidth=OUTLINE_LINEWIDTH_PT, edgecolor=theme["outline"])
    ax.add_patch(outer)

    inner_radius = OUTER_RADIUS * magnitude
    if inner_radius > ZERO_EPSILON:
        inner = Circle((x, y), inner_radius, color=INNER_COLOR, alpha=0.95)
        ax.add_patch(inner)

        line_length = OUTER_RADIUS
        end_x = x + line_length * math.cos(phase)
        end_y = y + line_length * math.sin(phase)
        ax.plot([x, end_x], [y, end_y], color=theme["phase"], linewidth=2.2, solid_capstyle="round")
        ax.plot(x, y, marker="o", markersize=3.2, color=theme["phase"])

    ax.text(x, -1.38, label, ha="center", va="top", fontsize=14, color=theme["text"])


def theme_config(theme_name):
    if theme_name == "light":
        return {
            "outline": "#64748b",
            "phase": "#0f172a",
            "text": "#0f172a",
        }

    return {
        "outline": "#cbd5e1",
        "phase": "#f8fafc",
        "text": "#f8fafc",
    }


if __name__ == "__main__":
    try:
        main()
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
