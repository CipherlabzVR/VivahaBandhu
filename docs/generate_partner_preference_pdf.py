"""Generate a plain-language PDF explaining partner preference matching weights."""
from __future__ import annotations

import os

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT_PATH = os.path.join(os.path.dirname(__file__), "Partner_Preference_Matching_Explained.pdf")

PRIMARY = HexColor("#c45c26")
DARK = HexColor("#1f2937")
MUTED = HexColor("#4b5563")
LIGHT_BG = HexColor("#fff7ed")
ROW_ALT = HexColor("#fdf8f3")
BORDER = HexColor("#fed7aa")
GREEN = HexColor("#047857")
HEADER_BG = HexColor("#9a3412")


def build_pdf(path: str = OUT_PATH) -> str:
    doc = SimpleDocTemplate(
        path,
        pagesize=A4,
        leftMargin=0.7 * inch,
        rightMargin=0.7 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
        title="How Partner Preference Matching Works",
        author="MyMatch.lk",
    )

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="DocTitle",
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=26,
            textColor=HEADER_BG,
            alignment=TA_CENTER,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="DocSubtitle",
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=18,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SecHead",
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=18,
            textColor=HEADER_BG,
            spaceBefore=14,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyText2",
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=DARK,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BulletBody",
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=DARK,
            leftIndent=14,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Callout",
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=HexColor("#7c2d12"),
            alignment=TA_LEFT,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableCell",
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=DARK,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableCellBold",
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=13,
            textColor=DARK,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableHead",
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=13,
            textColor=white,
            alignment=TA_CENTER,
        )
    )
    styles.add(
        ParagraphStyle(
            name="FooterNote",
            fontName="Helvetica-Oblique",
            fontSize=8.5,
            leading=11,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceBefore=16,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ExampleLabel",
            fontName="Helvetica-Bold",
            fontSize=10.5,
            leading=14,
            textColor=GREEN,
            spaceBefore=6,
            spaceAfter=4,
        )
    )

    def cell(text: str, bold: bool = False):
        return Paragraph(text, styles["TableCellBold"] if bold else styles["TableCell"])

    story = []
    story.append(Paragraph("How Partner Preference Matching Works", styles["DocTitle"]))
    story.append(Paragraph("A simple guide for MyMatch.lk members", styles["DocSubtitle"]))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=14))

    story.append(Paragraph("What is this?", styles["SecHead"]))
    story.append(
        Paragraph(
            "When you use <b>Preferred Search</b> or see <b>matched profiles</b>, the system compares "
            "your partner preferences with another person's profile and gives a <b>match percentage</b> "
            "(from 0% to 100%). A higher percentage means they fit your preferences better.",
            styles["BodyText2"],
        )
    )

    story.append(Paragraph("The simple idea", styles["SecHead"]))
    story.append(
        Paragraph(
            "Think of it like a checklist with points. Each preference you care about has a certain "
            "number of points (its <b>weight</b>). If the other person matches that preference, you earn "
            "those points. At the end, we turn your points into a percentage.",
            styles["BodyText2"],
        )
    )
    story.append(
        Paragraph(
            "<b>Match % = (points you earned / points that apply) x 100</b>",
            styles["Callout"],
        )
    )

    story.append(Paragraph("Preference weights (points)", styles["SecHead"]))
    story.append(
        Paragraph(
            "These are the points each preference is worth when you have filled it in on your profile:",
            styles["BodyText2"],
        )
    )

    rows = [
        [
            Paragraph("Preference", styles["TableHead"]),
            Paragraph("Points", styles["TableHead"]),
            Paragraph("What it means in plain language", styles["TableHead"]),
        ]
    ]
    data_rows = [
        ("Age range", "20", "Are they within the age range you want?"),
        ("Religion", "20", "Does their religion match what you prefer?"),
        ("Country of residence", "10", "Do they live in a country you prefer?"),
        ("Eating habits", "10", "Does their diet match (for example vegetarian)?"),
        ("Drinking habits", "10", "Is their drinking within what you accept?"),
        ("Smoking habits", "10", "Is their smoking within what you accept?"),
        ("Education / qualification", "10", "Do they meet your minimum education level?"),
        ("Country of origin", "10", "Is their origin country one you prefer?"),
        ("Ethnicity", "10", "Does their family ethnicity match your preference?"),
        ("Complexion", "10", "Does their complexion match what you prefer?"),
    ]
    for pref, pts, meaning in data_rows:
        rows.append([cell(pref, True), cell(pts), cell(meaning)])

    table = Table(rows, colWidths=[1.7 * inch, 0.7 * inch, 4.0 * inch])
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("ALIGN", (1, 1), (1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(rows)):
        bg = LIGHT_BG if i % 2 else ROW_ALT
        style_cmds.append(("BACKGROUND", (0, i), (-1, i), bg))
    table.setStyle(TableStyle(style_cmds))
    story.append(table)
    story.append(Spacer(1, 8))
    story.append(
        Paragraph(
            "<b>Total if you set every preference:</b> 20 + 20 + (10 x 8) = <b>120 points</b>. "
            "Your percentage is calculated only from the preferences you actually filled in.",
            styles["BodyText2"],
        )
    )

    story.append(Paragraph("Important rules (easy version)", styles["SecHead"]))
    story.append(
        Paragraph(
            "- <b>Only what you fill in counts.</b> If you leave a preference blank or choose "
            '"Any", it is ignored - it does not lower your match %.',
            styles["BulletBody"],
        )
    )
    story.append(
        Paragraph(
            "- <b>Age and Religion are most important</b> (20 points each). Everything else is 10 points.",
            styles["BulletBody"],
        )
    )
    story.append(
        Paragraph(
            "- <b>If you set no preferences at all</b> in Preferred Search, everyone shows as 100% "
            "(you are open to all).",
            styles["BulletBody"],
        )
    )
    story.append(
        Paragraph(
            "- <b>Unknown details</b> (for example age missing) are usually treated as acceptable, "
            "so people are not unfairly marked down.",
            styles["BulletBody"],
        )
    )

    story.append(Paragraph("Special rules in everyday words", styles["SecHead"]))
    story.append(Paragraph("<b>Drinking and smoking</b>", styles["BodyText2"]))
    story.append(
        Paragraph(
            "These use levels: <b>Never -&gt; Occasionally -&gt; Frequently</b>. "
            'If you prefer "Never", only someone who never drinks/smokes (or has not said) will match. '
            'If you prefer "Occasionally", Never or Occasionally is OK. '
            'If you prefer "Frequently", all levels are OK.',
            styles["BodyText2"],
        )
    )
    story.append(Paragraph("<b>Education</b>", styles["BodyText2"]))
    story.append(
        Paragraph(
            'Your choice is a <b>minimum</b>. If you want "Degree", then Degree, Masters, or PhD all '
            "count as a match. A lower level (for example A/L only) does not.",
            styles["BodyText2"],
        )
    )
    story.append(Paragraph("<b>Ethnicity</b>", styles["BodyText2"]))
    story.append(
        Paragraph(
            "We check the other person's father or mother ethnicity. If either matches your preference, "
            "it counts.",
            styles["BodyText2"],
        )
    )

    story.append(Paragraph("Example", styles["SecHead"]))
    story.append(
        Paragraph(
            "You set only three preferences: Age (20), Religion (20), and Drinking (10). "
            "So the maximum for you is <b>50 points</b>.",
            styles["BodyText2"],
        )
    )
    story.append(Paragraph("- Age matches -> +20", styles["BulletBody"]))
    story.append(Paragraph("- Religion does not match -> +0", styles["BulletBody"]))
    story.append(Paragraph("- Drinking matches -> +10", styles["BulletBody"]))
    story.append(
        Paragraph(
            "<b>Points earned = 30. Match % = 30 / 50 x 100 = 60%</b>",
            styles["ExampleLabel"],
        )
    )

    story.append(Paragraph("Two ways matching is used", styles["SecHead"]))
    two_way = [
        [
            Paragraph("<b>Preferred Search</b>", styles["TableCellBold"]),
            Paragraph("<b>Matched profiles</b>", styles["TableCellBold"]),
        ],
        [
            Paragraph(
                "Looks only at <b>your</b> preferences vs their profile (one direction). "
                "Blank preferences are skipped. This is the percentage you usually see when "
                "searching with preferences.",
                styles["TableCell"],
            ),
            Paragraph(
                "Looks both ways: how well they fit you <b>and</b> how well you fit them. "
                "If only one side matches on a preference, that preference gives half points.",
                styles["TableCell"],
            ),
        ],
    ]
    t2 = Table(two_way, colWidths=[3.2 * inch, 3.2 * inch])
    t2.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),
                ("BACKGROUND", (0, 1), (-1, 1), white),
                ("BOX", (0, 0), (-1, -1), 1, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(t2)

    story.append(Spacer(1, 14))
    story.append(
        Paragraph(
            "Tip: Fill in the preferences that matter most to you. Age and religion carry the most "
            'weight. Leaving something as "Any" means you are open on that point and it will not '
            "affect the percentage.",
            styles["BodyText2"],
        )
    )
    story.append(
        Paragraph(
            "MyMatch.lk - Partner preference matching guide - For members",
            styles["FooterNote"],
        )
    )

    def add_page_number(canvas, doc_):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawCentredString(A4[0] / 2, 0.4 * inch, f"Page {doc_.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    return path


if __name__ == "__main__":
    written = build_pdf()
    print(f"Wrote {written}")
    print(f"Size {os.path.getsize(written)} bytes")
