"""
Generates a formatted .pdf of a business audit report (see report_prompt in server.py
for the JSON shape) using reportlab. No external template needed.
"""

from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER
from reportlab.lib import colors
from io import BytesIO

NAVY = colors.HexColor("#1E2761")
ICE = colors.HexColor("#EEF2FF")
MUTED = colors.HexColor("#666A7A")
DARK = colors.HexColor("#22222A")

_styles = getSampleStyleSheet()
_styles.add(ParagraphStyle(name="RCTitle", fontName="Helvetica-Bold", fontSize=24, leading=29,
                            textColor=colors.white, spaceAfter=4))
_styles.add(ParagraphStyle(name="RCSubtitle", fontName="Helvetica", fontSize=12, leading=16,
                            textColor=ICE))
_styles.add(ParagraphStyle(name="RCH1", fontName="Helvetica-Bold", fontSize=16, leading=20,
                            textColor=NAVY, spaceBefore=14, spaceAfter=8))
_styles.add(ParagraphStyle(name="RCH2", fontName="Helvetica-Bold", fontSize=11.5, leading=15,
                            textColor=NAVY, spaceBefore=8, spaceAfter=3))
_styles.add(ParagraphStyle(name="RCBody", fontName="Helvetica", fontSize=9.7, leading=14,
                            textColor=DARK, spaceAfter=5))
_styles.add(ParagraphStyle(name="RCBullet", fontName="Helvetica", fontSize=9.5, leading=13.5,
                            textColor=DARK, leftIndent=10, spaceAfter=2))
_styles.add(ParagraphStyle(name="RCReelTitle", fontName="Helvetica-Bold", fontSize=10.3, leading=13,
                            textColor=NAVY, spaceBefore=6))
_styles.add(ParagraphStyle(name="RCReelBody", fontName="Helvetica", fontSize=9, leading=12.5,
                            textColor=DARK, spaceAfter=2))


def _p(text, style="RCBody"):
    if text is None:
        text = ""
    text = str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return Paragraph(text, _styles[style])


def _bullets(items, style="RCBullet"):
    return [_p(f"\u2022 {i}", style) for i in (items or [])]


def _section_header(text):
    return [_p(text, "RCH1"), HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#dddddd")),
            Spacer(1, 4)]


def build_report_pdf(report: dict, business_name: str, category: str, city: str, state: str) -> BytesIO:
    story = []

    # ---- Cover ----
    story.append(Spacer(1, 0.2 * inch))
    cover_table = Table(
        [[_p(f"{business_name}", "RCTitle")],
         [_p("Business Intelligence Report", "RCSubtitle")],
         [_p(f"{category} \u00b7 {city}, {state}", "RCSubtitle")]],
        colWidths=[6.6 * inch],
    )
    cover_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 18),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 16),
    ]))
    story.append(cover_table)
    story.append(Spacer(1, 14))

    # ---- Business Summary ----
    bs = report.get("business_summary", {})
    story += _section_header("Business Summary")
    for label, key in [("What they do", "what_they_do"), ("Brand positioning", "brand_positioning"),
                        ("Customer experience", "customer_experience"),
                        ("Target audience (estimated)", "target_audience_estimated")]:
        story.append(_p(label, "RCH2"))
        story.append(_p(bs.get(key, "")))

    # ---- Google Maps Analysis ----
    gm = report.get("google_maps_analysis", {})
    story += _section_header("Google Maps Analysis")
    gm_table = Table([
        [_p("Estimated Rating", "RCH2"), _p("Estimated Reviews", "RCH2"), _p("Peak Hours", "RCH2")],
        [_p(gm.get("estimated_rating", "\u2014")), _p(gm.get("estimated_reviews", "\u2014")), _p(gm.get("peak_hours", "\u2014"))],
    ], colWidths=[2.2 * inch, 2.2 * inch, 2.2 * inch])
    gm_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#dddddd")),
        ("BACKGROUND", (0, 0), (-1, 0), ICE),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(gm_table)
    story.append(Spacer(1, 6))
    story.append(_p("Positive themes", "RCH2"))
    story += _bullets(gm.get("positive_themes"))
    story.append(_p("Common complaints", "RCH2"))
    story += _bullets(gm.get("common_complaints"))

    # ---- Instagram Audit ----
    ig = report.get("instagram_audit", {})
    story += _section_header("Instagram Audit")
    for label, key in [("Bio", "bio_assessment"), ("Highlights", "highlights"),
                        ("Profile picture", "profile_picture"), ("Posting frequency", "posting_frequency"),
                        ("Reels", "reels"), ("Engagement", "engagement"),
                        ("Visual consistency", "visual_consistency")]:
        if ig.get(key):
            story.append(_p(f"<b>{label}:</b> {ig.get(key)}"))
    story.append(_p("Strengths", "RCH2")); story += _bullets(ig.get("strengths"))
    story.append(_p("Weaknesses", "RCH2")); story += _bullets(ig.get("weaknesses"))
    story.append(_p("Missed opportunities", "RCH2")); story += _bullets(ig.get("missed_opportunities"))
    story.append(_p("Quick wins", "RCH2")); story += _bullets(ig.get("quick_wins"))

    # ---- Nearby Opportunities ----
    story.append(PageBreak())
    story += _section_header("Nearby Opportunities")
    for o in report.get("nearby_opportunities", []):
        story.append(_p(f"<b>{o.get('type','')}</b> \u2014 {o.get('example','')}", "RCH2"))
        story.append(_p(o.get("how_to_target", "")))

    # ---- Competitor Analysis ----
    story += _section_header("Competitor Analysis")
    comp_rows = [[_p("Name", "RCH2"), _p("Followers", "RCH2"), _p("Strengths", "RCH2"), _p("Weaknesses", "RCH2")]]
    for c in report.get("competitor_analysis", []):
        comp_rows.append([_p(c.get("name", "")), _p(c.get("followers", "")),
                           _p(c.get("strengths", "")), _p(c.get("weaknesses", ""))])
    comp_table = Table(comp_rows, colWidths=[1.4*inch, 0.9*inch, 2.15*inch, 2.15*inch])
    comp_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#dddddd")),
        ("BACKGROUND", (0, 0), (-1, 0), ICE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(comp_table)

    # ---- Growth Strategy ----
    story.append(PageBreak())
    gs = report.get("growth_strategy", {})
    ta = gs.get("target_audience", {})
    story += _section_header("Growth Strategy")
    story.append(_p("Target audience", "RCH2"))
    story.append(_p(f"<b>Primary:</b> {ta.get('primary','')}"))
    story.append(_p(f"<b>Secondary:</b> {ta.get('secondary','')}"))
    story.append(_p(f"<b>Future:</b> {ta.get('future','')}"))
    story.append(_p("Content pillars", "RCH2"))
    story += _bullets(gs.get("content_pillars"))
    story.append(_p("Monthly content mix", "RCH2"))
    mix_rows = [[_p("Pillar", "RCH2"), _p("%", "RCH2")]]
    for m in gs.get("monthly_content_mix", []):
        mix_rows.append([_p(m.get("pillar", "")), _p(f"{m.get('percent','')}%")])
    mix_table = Table(mix_rows, colWidths=[3*inch, 1*inch])
    mix_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#dddddd")),
        ("BACKGROUND", (0, 0), (-1, 0), ICE),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(mix_table)

    # ---- Reel Ideas ----
    story.append(PageBreak())
    story += _section_header(f"Reel Ideas ({len(report.get('reel_ideas', []))})")
    for i, r in enumerate(report.get("reel_ideas", []), 1):
        story.append(_p(f"{i}. {r.get('title','')}  <font color='#666A7A' size='8'>[{r.get('category','')}]</font>", "RCReelTitle"))
        if r.get("hook"):
            story.append(_p(f"<b>Hook:</b> {r['hook']}", "RCReelBody"))
        if r.get("shot_by_shot_script"):
            story.append(_p(f"<b>Script:</b> {r['shot_by_shot_script']}", "RCReelBody"))
        if r.get("share_save_angle"):
            story.append(_p(f"<b>Why they'll share/save it:</b> {r['share_save_angle']}", "RCReelBody"))
        if r.get("cta"):
            story.append(_p(f"<b>CTA:</b> {r['cta']}", "RCReelBody"))
        if r.get("technical_notes"):
            story.append(_p(f"<b>Tip:</b> {r['technical_notes']}", "RCReelBody"))
        story.append(Spacer(1, 4))

    def _footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(0.7 * inch, 0.4 * inch, f"{business_name} \u2014 RoopCraft Business Intelligence Report")
        canvas.drawRightString(letter[0] - 0.7 * inch, 0.4 * inch, f"Page {doc.page}")
        canvas.restoreState()

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=letter,
        topMargin=0.6 * inch, bottomMargin=0.7 * inch,
        leftMargin=0.7 * inch, rightMargin=0.7 * inch,
        title=f"{business_name} - Business Intelligence Report",
    )
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    buf.seek(0)
    return buf
