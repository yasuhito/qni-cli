#!/usr/bin/env python3

import base64
import io
import json
import math
import sys

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from PIL import Image
from mpl_toolkits.mplot3d import proj3d

CANVAS_PX = 512
DPI = 100
FIGSIZE = CANVAS_PX / DPI
SPHERE_STEPS = 24
AXIS_LABELS = [
    {"text": "x", "anchor": (1.1, 0.0, 0.0), "offset": (6, 0), "fontsize": 11, "ha": "left", "va": "center"},
    {"text": "y", "anchor": (0.0, 1.1, 0.0), "offset": (4, 2), "fontsize": 11, "ha": "left", "va": "bottom"},
    {"text": "z", "anchor": (0.0, 0.0, 1.1), "offset": (0, 4), "fontsize": 11, "ha": "center", "va": "bottom"},
]
BASIS_LABELS = [
    {"text": "|0>", "anchor": (0.0, 0.0, 1.1), "offset": (0, 18), "fontsize": 13, "ha": "center", "va": "bottom"},
    {"text": "|1>", "anchor": (0.0, 0.0, -1.1), "offset": (0, -4), "fontsize": 13, "ha": "center", "va": "top"},
    {"text": "|+>", "anchor": (1.1, 0.0, 0.0), "offset": (28, 0), "fontsize": 13, "ha": "left", "va": "center"},
    {"text": "|->", "anchor": (-1.1, 0.0, 0.0), "offset": (-28, 0), "fontsize": 13, "ha": "right", "va": "center"},
    {"text": "|+i>", "anchor": (0.0, 1.1, 0.0), "offset": (16, 14), "fontsize": 13, "ha": "left", "va": "bottom"},
    {"text": "|-i>", "anchor": (0.0, -1.1, 0.0), "offset": (-16, -14), "fontsize": 13, "ha": "right", "va": "top"},
]


def main():
    payload = json.load(sys.stdin)
    render(payload)


def label_layout():
    labels = {}
    for label in all_labels():
        labels[label["text"]] = [float(component) for component in label["anchor"]]
    return {"labels": labels}


def label_kwargs(label):
    kwargs = {}
    if "ha" in label:
        kwargs["ha"] = label["ha"]
    if "va" in label:
        kwargs["va"] = label["va"]
    return kwargs


def label_metrics():
    fig = plt.figure(figsize=(FIGSIZE, FIGSIZE), dpi=DPI)
    fig.patch.set_alpha(0)
    ax = fig.add_subplot(111, projection="3d")
    ax.set_facecolor((0, 0, 0, 0))
    style_axes(ax)
    draw_sphere(ax, theme_config("light"))
    draw_axes(ax, theme_config("light"))
    artists = draw_labels(ax, theme_config("light"))

    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    labels = {}
    for label in all_labels():
        artist = artists[label["text"]]
        bbox = artist.get_window_extent(renderer)
        labels[label["text"]] = {
            "bbox": {
                "left": float(bbox.x0),
                "right": float(bbox.x1),
                "bottom": float(bbox.y0),
                "top": float(bbox.y1),
            },
            "anchor": project_point(ax, label["anchor"]),
        }

    metrics = {
        "axis_tips": {label["text"]: project_point(ax, label["anchor"]) for label in AXIS_LABELS},
        "labels": labels,
    }
    plt.close(fig)
    return metrics


def all_labels():
    return AXIS_LABELS + BASIS_LABELS


def project_point(ax, point):
    x, y, _ = proj3d.proj_transform(*point, ax.get_proj())
    display_x, display_y = ax.transData.transform((x, y))
    return {"x": float(display_x), "y": float(display_y)}


def render(payload):
    frames = payload["frames"]
    format_name = payload["format"]
    output_path = payload["output_path"]
    show_trail = payload.get("show_trail", False)
    theme = theme_config(payload.get("theme", "dark"))

    if format_name == "png":
        image = render_frame_image(frames, len(frames) - 1, theme, show_trail)
        image.save(output_path, format="PNG")
        return

    if format_name == "inline_png":
        sys.stdout.buffer.write(render_frame_bytes(frames, len(frames) - 1, theme, show_trail))
        return

    if format_name == "apng":
        images = [render_frame_image(frames, index, theme, show_trail) for index in range(len(frames))]
        first, rest = images[0], images[1:]
        first.save(
            output_path,
            format="PNG",
            save_all=True,
            append_images=rest,
            duration=[90] * len(images),
            loop=0,
            default_image=False,
        )
        return

    if format_name == "inline_frames":
        encoded_frames = [
            base64.b64encode(render_frame_bytes(frames, index, theme, show_trail)).decode("ascii")
            for index in range(len(frames))
        ]
        json.dump({"frames": encoded_frames}, sys.stdout)
        return

    raise ValueError(f"unsupported bloch output format: {format_name}")


def render_frame_image(frames, frame_index, theme, show_trail):
    fig = plt.figure(figsize=(FIGSIZE, FIGSIZE), dpi=DPI)
    fig.patch.set_alpha(0)
    ax = fig.add_subplot(111, projection="3d")
    ax.set_facecolor((0, 0, 0, 0))
    style_axes(ax)
    draw_sphere(ax, theme)
    draw_axes(ax, theme)
    if show_trail:
        draw_trail(ax, frames, frame_index, theme)
    draw_state_vector(ax, frames[frame_index]["vector"], theme)
    draw_labels(ax, theme)

    buffer = io.BytesIO()
    plt.savefig(buffer, format="png", transparent=True)
    plt.close(fig)
    buffer.seek(0)
    return Image.open(buffer).convert("RGBA")


def render_frame_bytes(frames, frame_index, theme, show_trail):
    image = render_frame_image(frames, frame_index, theme, show_trail)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def style_axes(ax):
    ax.set_xlim(-1.1, 1.1)
    ax.set_ylim(-1.1, 1.1)
    ax.set_zlim(-1.1, 1.1)
    ax.view_init(elev=20, azim=-55)
    ax.set_box_aspect((1, 1, 1))
    ax.grid(False)
    ax.set_axis_off()


def draw_sphere(ax, theme):
    u = np.linspace(0, 2 * math.pi, SPHERE_STEPS)
    v = np.linspace(0, math.pi, SPHERE_STEPS)
    x = np.outer(np.cos(u), np.sin(v))
    y = np.outer(np.sin(u), np.sin(v))
    z = np.outer(np.ones(np.size(u)), np.cos(v))
    ax.plot_wireframe(
        x,
        y,
        z,
        rstride=2,
        cstride=2,
        color=theme["wire"],
        linewidth=0.6,
        alpha=0.55,
    )


def draw_axes(ax, theme):
    axes = [
        ((-1.1, 0, 0), (1.1, 0, 0)),
        ((0, -1.1, 0), (0, 1.1, 0)),
        ((0, 0, -1.1), (0, 0, 1.1)),
    ]
    for start, end in axes:
        ax.plot(
            [start[0], end[0]],
            [start[1], end[1]],
            [start[2], end[2]],
            color=theme["axis"],
            linewidth=1.5,
            alpha=0.9,
        )


def draw_labels(ax, theme):
    return {
        label["text"]: add_projected_label(ax, label, theme)
        for label in all_labels()
    }


def add_projected_label(ax, label, theme):
    x, y, _ = proj3d.proj_transform(*label["anchor"], ax.get_proj())
    return ax.annotate(
        label["text"],
        xy=(x, y),
        xycoords="data",
        xytext=label.get("offset", (0, 0)),
        textcoords="offset points",
        color=theme["text"],
        fontsize=label["fontsize"],
        annotation_clip=False,
        **label_kwargs(label),
    )


def draw_trail(ax, frames, frame_index, theme):
    trail = [frame["vector"] for frame in frames[: frame_index + 1]]
    if len(trail) < 2:
        return

    xs = [point[0] for point in trail]
    ys = [point[1] for point in trail]
    zs = [point[2] for point in trail]
    ax.plot(xs, ys, zs, color=theme["trail"], linewidth=2.0, alpha=0.9)


def draw_state_vector(ax, vector, theme):
    x, y, z = vector
    ax.quiver(
        0,
        0,
        0,
        x,
        y,
        z,
        color=theme["vector"],
        linewidth=2.8,
        arrow_length_ratio=0.12,
    )
    ax.scatter([x], [y], [z], color=theme["vector"], s=48)


def theme_config(name):
    if name == "light":
        return {
            "axis": "#334155",
            "text": "#0f172a",
            "trail": "#0f766e",
            "vector": "#ea580c",
            "wire": "#94a3b8",
        }

    return {
        "axis": "#cbd5e1",
        "text": "#f8fafc",
        "trail": "#67e8f9",
        "vector": "#fb923c",
        "wire": "#64748b",
    }


if __name__ == "__main__":
    main()
