"""Build the human-readable PDFs from the versioned Markdown guides.

Requires reportlab. Run from any directory: python scripts/build-pdfs.py
Source documents are never overwritten.
"""
from pathlib import Path
from xml.sax.saxutils import escape
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Preformatted, KeepTogether,
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'output' / 'pdf'
OUT.mkdir(parents=True, exist_ok=True)
PAGE = (595.276, 841.89)
INK = colors.HexColor('#16232d')
ACCENT = colors.HexColor('#c78b3e')
MUTED = colors.HexColor('#53636e')
PAPER = colors.HexColor('#faf8f3')
WIDTH = PAGE[0] - 100

fontdir = Path('C:/Windows/Fonts')
if (fontdir / 'arial.ttf').exists():
    for name, filename in [('Want', 'arial.ttf'), ('WantBold', 'arialbd.ttf'), ('WantItalic', 'ariali.ttf')]:
        pdfmetrics.registerFont(TTFont(name, str(fontdir / filename)))
    pdfmetrics.registerFontFamily('Want', normal='Want', bold='WantBold', italic='WantItalic', boldItalic='WantBold')
    FONT, BOLD = 'Want', 'WantBold'
else:
    FONT, BOLD = 'Helvetica', 'Helvetica-Bold'

MONO = 'Courier'
if (fontdir / 'consola.ttf').exists():
    pdfmetrics.registerFont(TTFont('WantMono', str(fontdir / 'consola.ttf')))
    MONO = 'WantMono'

styles = getSampleStyleSheet()
body = ParagraphStyle('WantBody', fontName=FONT, fontSize=10.2, leading=14.4, textColor=INK,
                      spaceAfter=7, splitLongWords=True, allowWidows=0, allowOrphans=0)
small = ParagraphStyle('WantSmall', parent=body, fontSize=8.5, leading=11.5, spaceAfter=4)
h1 = ParagraphStyle('WantH1', parent=body, fontName=BOLD, fontSize=24, leading=29, spaceAfter=18, keepWithNext=True)
h2 = ParagraphStyle('WantH2', parent=body, fontName=BOLD, fontSize=17, leading=22, spaceBefore=15, spaceAfter=10, keepWithNext=True)
h3 = ParagraphStyle('WantH3', parent=body, fontName=BOLD, fontSize=12, leading=16, spaceBefore=11, spaceAfter=7, keepWithNext=True)
bullet = ParagraphStyle('WantBullet', parent=body, leftIndent=13, firstLineIndent=-9, spaceAfter=5)
code_style = ParagraphStyle('WantCode', fontName=MONO, fontSize=9.1, leading=12.2,
                            textColor=INK, backColor=colors.HexColor('#eff1f1'),
                            borderPadding=9, spaceBefore=5, spaceAfter=10)


def clean(text):
    return (text.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', ' - ')
            .replace('→', ' > ').replace('↗', '>').replace('↑', 'Up').replace('↓', 'Down')
            .replace('←', 'Left').replace('✅', 'Done'))


def inline(text):
    text = escape(clean(text))
    def link(m):
        label, target = m.group(1), m.group(2)
        return f'<link href="{target}" color="#865d28">{label}</link>' if target.startswith('https://') else label
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', link, text)
    text = re.sub(r'`([^`]+)`', rf'<font name="{MONO}">\1</font>', text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', text)
    return text


class WantDoc(BaseDocTemplate):
    def __init__(self, filename, label, **kwargs):
        super().__init__(filename, pagesize=PAGE, leftMargin=50, rightMargin=50,
                         topMargin=60, bottomMargin=53, title=f'WANT - {label}',
                         author='WANT project team', **kwargs)
        self.label = label
        self.addPageTemplates(PageTemplate('body', [Frame(50, 53, WIDTH, PAGE[1]-113,
                               leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)],
                               onPage=self.draw_page))
        self.section_count = 0

    def draw_page(self, canvas, doc):
        canvas.saveState()
        if doc.page == 1:
            canvas.setFillColor(INK)
            canvas.rect(0, 0, *PAGE, fill=1, stroke=0)
            canvas.setFillColor(ACCENT)
            canvas.rect(50, 745, 55, 4, fill=1, stroke=0)
            canvas.setFont(BOLD, 11)
            canvas.drawString(50, 716, 'WANT / PROJECT EDITION 01')
            canvas.setFillColor(colors.white)
            canvas.setFont(BOLD, 62)
            canvas.drawString(47, 634, 'WANT.')
            canvas.setFont(BOLD, 24)
            canvas.drawString(50, 588, self.label)
            canvas.setFont(FONT, 12)
            canvas.setFillColor(colors.HexColor('#d3dce2'))
            lines = ['The wrong person. A choice that matters.',
                     'Story, exploration and real-time combat.']
            for i, line in enumerate(lines): canvas.drawString(50, 551 - i*20, line)
            poster = ROOT / 'assets/characters/k/k-persona-poster.png'
            canvas.drawImage(ImageReader(str(poster)), 338, 140, width=207, height=259, mask='auto')
            canvas.setFillColor(ACCENT)
            canvas.setFont(BOLD, 10)
            canvas.drawString(50, 366, 'FOUR-DAY FOUNDATION')
            canvas.setFillColor(colors.HexColor('#d3dce2'))
            canvas.setFont(FONT, 10)
            for i, line in enumerate(['Desktop keyboard + mouse', '20-25 minute story target', 'Campaign first. Trials later.', '9 November 2026']):
                canvas.drawString(50, 338-i*20, line)
            canvas.setFont(FONT, 9)
            canvas.drawString(50, 72, 'Based on the creator\'s script and development decisions.')
        else:
            canvas.setFillColor(PAPER)
            canvas.rect(0, 0, *PAGE, fill=1, stroke=0)
            canvas.setFont(BOLD, 8)
            canvas.setFillColor(MUTED)
            canvas.drawString(50, 806, 'WANT / ' + self.label.upper())
            canvas.setStrokeColor(colors.HexColor('#d9d5ca'))
            canvas.line(50, 793, PAGE[0]-50, 793)
            canvas.line(50, 42, PAGE[0]-50, 42)
            canvas.setFont(FONT, 8)
            canvas.drawString(50, 27, 'Version 1.0 | Campaign foundation | 9 Nov 2026')
            canvas.drawRightString(PAGE[0]-50, 27, str(doc.page))
        canvas.restoreState()

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name in ['WantH1', 'WantH2']:
            key = f'section-{self.section_count}'
            self.section_count += 1
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(flowable.getPlainText(), key, level=0, closed=False)


def table_block(rows):
    header, *data = rows
    count = len(header)
    ratios = {2: [0.29, 0.71], 3: [0.22, 0.33, 0.45],
              4: [0.15, 0.3, 0.3, 0.25], 5: [0.15, 0.23, 0.23, 0.20, 0.19]}
    widths = [WIDTH*x for x in ratios.get(count, [1/count]*count)]
    cells = [[Paragraph(inline(v), ParagraphStyle('Head', parent=small, fontName=BOLD,
                    textColor=colors.white)) for v in header]]
    cells += [[Paragraph(inline(v), small) for v in row] for row in data]
    table = Table(cells, colWidths=widths, repeatRows=1, hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), INK), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0eee7')]),
        ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LINEBELOW', (0, -1), (-1, -1), .4, colors.HexColor('#d9d5ca')),
    ]))
    return [table, Spacer(1, 10)]


def markdown(path, split_sections=False, drop_title=False):
    lines = path.read_text(encoding='utf-8').splitlines()
    flow = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if line.startswith('```'):
            i += 1
            block = []
            while i < len(lines) and not lines[i].startswith('```'):
                block.append(clean(lines[i]))
                i += 1
            import textwrap
            wrapped = []
            for entry in block:
                wrapped.extend(textwrap.wrap(entry, width=84, replace_whitespace=False,
                                            drop_whitespace=False) or [''])
            flow.append(KeepTogether([Preformatted('\n'.join(wrapped), code_style)]))
            i += 1
            continue
        if line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                row = [cell.strip() for cell in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[:\-\s]+', cell or '-') for cell in row): rows.append(row)
                i += 1
            flow.extend(table_block(rows))
            continue
        if line.startswith('# '):
            if not drop_title: flow.append(Paragraph(inline(line[2:]), h1))
        elif line.startswith('## '):
            if flow and (split_sections or line.startswith(('## Phase ', '## 3. Reusable prompt preface'))):
                flow.append(PageBreak())
            flow.append(Paragraph(inline(line[3:]), h2))
        elif line.startswith('### '):
            flow.append(Paragraph(inline(line[4:]), h3))
        elif line.startswith('- '):
            flow.append(Paragraph('• ' + inline(line[2:]), bullet))
        elif re.match(r'^\d+\. ', line):
            flow.append(Paragraph(inline(line), bullet))
        else:
            paragraph = [line]
            while i+1 < len(lines) and lines[i+1].strip() and not re.match(r'^(#|\||```|- |\d+\. )', lines[i+1]):
                i += 1
                paragraph.append(lines[i].strip())
            next_line = next((s.strip() for s in lines[i+1:] if s.strip()), '')
            paragraph_style = body
            if next_line.startswith(('```', '- ')):
                paragraph_style = ParagraphStyle('WantLeadIn', parent=body, keepWithNext=True)
            flow.append(Paragraph(inline(' '.join(paragraph)), paragraph_style))
        i += 1
    return flow


def build_playthrough():
    flow = [Spacer(1, 1), PageBreak()]
    flow += markdown(ROOT/'docs/PLAYTHROUGH.md', split_sections=True, drop_title=True)
    doc = WantDoc(str(OUT/'WANT-Playthrough.pdf'), 'Complete playthrough')
    doc.build(flow)


def build_guide():
    flow = [Spacer(1, 1), PageBreak(), Paragraph('How to use this handbook', h1)]
    flow.append(Paragraph('Start with the shared decisions, then work through the phase guide. '
        'Each phase includes an implementation prompt, an independent review prompt, and '
        'checks a human must perform. The optional Trials track comes after the complete campaign.', body))
    sections = [
        ('DECISIONS.md', 'Shared decisions'),
        ('GUIDEBOOK.md', 'Four-day development phases'),
        ('TEAM_WORKFLOW.md', 'Team workflow'),
        ('ARCHITECTURE.md', 'Architecture and file ownership'),
        ('COMBAT_DESIGN.md', 'Combat specification'),
        ('ASSET_CHECKLIST.md', 'Asset production checklist'),
        ('DEPLOYMENT.md', 'Vercel and Supabase setup'),
        ('OPTIONAL_HORDE_GUIDE.md', 'Optional combat and leveling track'),
    ]
    for n, (_, title) in enumerate(sections, 1):
        flow.append(Paragraph(f'<b>{n:02d}</b> / {title}', body))
    flow.append(Spacer(1, 14))
    flow.append(Paragraph('The editable source of truth lives in docs/. This PDF is a convenient snapshot. '
        'Use the PDF bookmarks to navigate. Review docs/VERIFICATION.md for the actual test evidence; '
        'future features described here are not already implemented.', body))
    for filename, title in sections:
        flow.append(PageBreak())
        flow.append(Paragraph(title, h1))
        flow += markdown(ROOT/'docs'/filename, drop_title=True)
    doc = WantDoc(str(OUT/'WANT-Development-Guidebook.pdf'), 'Development guidebook')
    doc.build(flow)


if __name__ == '__main__':
    build_playthrough()
    build_guide()
    for path in sorted(OUT.glob('WANT-*.pdf')):
        print(f'{path.name}: {path.stat().st_size:,} bytes')
