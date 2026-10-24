#!/usr/bin/env python3
"""Create a compact QWERTYcube-style SVG from URFDLB facelets."""

import argparse
from html import escape
from pathlib import Path
import sys


FACE_ORDER = "URFDLB"
COLORS = {
    "R": "#9B1516",
    "L": "#FF6020",
    "U": "#DBE94E",
    "D": "#E4E9E5",
    "F": "#125AC8",
    "B": "#00B52C",
}


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "facelets",
        help="54 facelets ordered U, R, F, D, L, B",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="output file; omit to write SVG to standard output",
    )
    parser.add_argument(
        "--title",
        default="Twisty cube",
        help="accessible SVG title",
    )
    return parser.parse_args()


def validate_facelets(facelets):
    if len(facelets) != 54:
        raise ValueError(f"expected 54 facelets, got {len(facelets)}")
    invalid = sorted(set(facelets) - set(FACE_ORDER))
    if invalid:
        raise ValueError("invalid facelet characters: " + "".join(invalid))
    for face_idx, face in enumerate(FACE_ORDER):
        count = facelets.count(face)
        if count != 9:
            raise ValueError(f"expected 9 {face} facelets, got {count}")
        center_idx = face_idx * 9 + 4
        if facelets[center_idx] != face:
            raise ValueError(
                f"expected {face} center at index {center_idx}, "
                f"got {facelets[center_idx]}"
            )


def point_add(point, vector, amount):
    return (
        point[0] + vector[0] * amount,
        point[1] + vector[1] * amount,
    )


def format_point(point):
    return f"{point[0]:.3f},{point[1]:.3f}"


def make_face_polygons(facelets, origin, column_vector, row_vector):
    polygons = []
    for row in range(3):
        for column in range(3):
            top_left = point_add(
                point_add(origin, column_vector, column), row_vector, row
            )
            points = [
                top_left,
                point_add(top_left, column_vector, 1),
                point_add(
                    point_add(top_left, column_vector, 1), row_vector, 1
                ),
                point_add(top_left, row_vector, 1),
            ]
            color = COLORS[facelets[row * 3 + column]]
            polygons.append(
                f'    <polygon fill="{color}" points="'
                + " ".join(format_point(point) for point in points)
                + '"/>'
            )
    return polygons


def make_svg(facelets, title):
    faces = {
        face: facelets[idx * 9:(idx + 1) * 9]
        for idx, face in enumerate(FACE_ORDER)
    }

    # The three origins meet around the visible U/F/R corner. The vectors
    # produce three regular 3x3 parallelogram grids in a 100x100 view box.
    polygons = []
    polygons.extend(
        make_face_polygons(
            faces["U"],
            origin=(50, 3),
            column_vector=(47 / 3, 8),
            row_vector=(-47 / 3, 8),
        )
    )
    polygons.extend(
        make_face_polygons(
            faces["F"],
            origin=(3, 27),
            column_vector=(47 / 3, 8),
            row_vector=(0, 47 / 3),
        )
    )
    polygons.extend(
        make_face_polygons(
            faces["R"],
            origin=(50, 51),
            column_vector=(47 / 3, -8),
            row_vector=(0, 47 / 3),
        )
    )

    return "\n".join([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"',
        '     role="img" shape-rendering="geometricPrecision">',
        f"  <title>{escape(title)}</title>",
        '  <g stroke="#000000" stroke-width="2.25" '
        'stroke-linejoin="round">',
        *polygons,
        "  </g>",
        "</svg>",
        "",
    ])


def main():
    args = parse_args()
    facelets = args.facelets.strip().upper()
    try:
        validate_facelets(facelets)
    except ValueError as error:
        print(f"{Path(sys.argv[0]).name}: {error}", file=sys.stderr)
        return 2

    svg = make_svg(facelets, args.title)
    if args.output:
        args.output.write_text(svg, encoding="utf-8")
    else:
        sys.stdout.write(svg)
    return 0


if __name__ == "__main__":
    sys.exit(main())
