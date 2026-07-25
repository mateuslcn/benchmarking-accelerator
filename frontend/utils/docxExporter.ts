import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle,
  AlignmentType
} from 'docx';
import { saveAs } from 'file-saver';
import { BenchmarkInputs } from '../types';

function parseMarkdownRuns(text: string, defaultSize = 20, defaultColor = '1E293B'): TextRun[] {
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  
  parts.forEach(part => {
    if (!part) return;
    if (part.startsWith('**') && part.endsWith('**')) {
      const clean = part.slice(2, -2);
      runs.push(new TextRun({
        text: clean,
        bold: true,
        size: defaultSize,
        color: '0F172A'
      }));
    } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      const clean = part.slice(1, -1);
      runs.push(new TextRun({
        text: clean,
        italics: true,
        size: defaultSize,
        color: '334155'
      }));
    } else {
      runs.push(new TextRun({
        text: part,
        size: defaultSize,
        color: defaultColor
      }));
    }
  });
  
  return runs;
}

export const exportReportToDOCX = async (reportMarkdown: string, inputs: BenchmarkInputs) => {
  const lines = reportMarkdown.split('\n');
  const children: (Paragraph | Table)[] = [];

  const PRIMARY_COLOR = '0F172A';   // Slate 900
  const SECONDARY_COLOR = '334155'; // Slate 700
  const ACCENT_BLUE = '2563EB';    // Blue 600
  const TEXT_COLOR = '1E293B';     // Slate 800

  let inBlockquote = false;
  let blockquoteLines: string[] = [];
  let inTable = false;
  let tableLines: string[] = [];

  const flushBlockquote = () => {
    if (blockquoteLines.length === 0) return;
    const heroText = blockquoteLines.join(' ');
    
    const heroTable = new Table({
      alignment: AlignmentType.CENTER,
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              shading: { fill: 'F8FAFC' },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              borders: {
                left: { style: BorderStyle.SINGLE, size: 36, color: PRIMARY_COLOR },
                top: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
              },
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [
                    new TextRun({
                      text: "Executive Summary: ",
                      bold: true,
                      size: 20,
                      color: PRIMARY_COLOR
                    }),
                    new TextRun({
                      text: heroText.replace(/^>\s*/, '').replace(/^Executive Summary:\s*/i, ''),
                      size: 19,
                      color: TEXT_COLOR
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    });
    
    children.push(heroTable);
    children.push(new Paragraph({ spacing: { after: 120 } }));
    blockquoteLines = [];
    inBlockquote = false;
  };

  const flushTable = () => {
    if (tableLines.length === 0) return;
    
    // Process markdown table lines
    const parsedRows: string[][] = [];
    tableLines.forEach(tLine => {
      if (tLine.includes('|') && !tLine.includes('---')) {
        const cells = tLine.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1 || (idx === 0 && c !== '') || (idx === arr.length - 1 && c !== ''));
        if (cells.length > 0) {
          parsedRows.push(cells);
        }
      }
    });

    if (parsedRows.length > 0) {
      const tableRows: TableRow[] = [];

      parsedRows.forEach((rowCells, rIdx) => {
        const isHeader = rIdx === 0;
        const cellShading = isHeader ? PRIMARY_COLOR : (rIdx % 2 === 1 ? 'FFFFFF' : 'F8FAFC');

        const docxCells = rowCells.map(cText => {
          const runs = isHeader 
            ? [new TextRun({ text: cText.replace(/\*\*/g, ''), bold: true, color: 'FFFFFF', size: 19 })]
            : parseMarkdownRuns(cText, 18, TEXT_COLOR);

          return new TableCell({
            shading: { fill: cellShading },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: 'E2E8F0' },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                spacing: { before: 20, after: 20 },
                children: runs
              })
            ]
          });
        });

        tableRows.push(new TableRow({ children: docxCells }));
      });

      const docxTable = new Table({
        alignment: AlignmentType.CENTER,
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows
      });

      children.push(docxTable);
      children.push(new Paragraph({ spacing: { after: 140 } }));
    }

    tableLines = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Blockquotes
    if (trimmed.startsWith('>')) {
      inBlockquote = true;
      blockquoteLines.push(trimmed.replace(/^>\s*/, ''));
      continue;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    // Tables
    if (trimmed.startsWith('|')) {
      inTable = true;
      tableLines.push(trimmed);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!trimmed) {
      continue;
    }

    // Heading 1 (# ...)
    if (trimmed.startsWith('# ')) {
      const hText = trimmed.replace(/^#\s*/, '');
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 360, after: 120 },
          children: [
            new TextRun({
              text: hText,
              bold: true,
              size: 32, // 16pt
              color: PRIMARY_COLOR
            })
          ]
        })
      );
    }
    // Subtitle italic (*...*)
    else if (trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.startsWith('**')) {
      const sText = trimmed.replace(/^\*|\*$/g, '');
      children.push(
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: sText,
              italics: true,
              size: 24, // 12pt
              color: SECONDARY_COLOR
            })
          ]
        })
      );
    }
    // Heading 2 (## ...)
    else if (trimmed.startsWith('## ')) {
      const hText = trimmed.replace(/^##\s*/, '');
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 100 },
          children: [
            new TextRun({
              text: hText,
              bold: true,
              size: 26, // 13pt
              color: PRIMARY_COLOR
            })
          ]
        })
      );
    }
    // Heading 3 (### ...)
    else if (trimmed.startsWith('### ')) {
      const hText = trimmed.replace(/^###\s*/, '');
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 80 },
          children: [
            new TextRun({
              text: hText,
              bold: true,
              size: 22, // 11pt
              color: PRIMARY_COLOR
            })
          ]
        })
      );
    }
    // Bullet list items (- ... or * ...)
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bText = trimmed.replace(/^[-*]\s*/, '');
      const runs = parseMarkdownRuns(bText, 20, TEXT_COLOR);

      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 40, after: 60 },
          children: runs
        })
      );
    }
    // Standard paragraph
    else {
      const runs = parseMarkdownRuns(trimmed, 20, TEXT_COLOR);

      children.push(
        new Paragraph({
          spacing: { before: 60, after: 120 },
          children: runs
        })
      );
    }
  }

  if (inBlockquote) {
    flushBlockquote();
  }
  if (inTable) {
    flushTable();
  }

  // Build document with 20mm margins
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,    // ~20mm
              bottom: 1134,
              left: 1134,
              right: 1134,
            }
          }
        },
        children: children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'executive-benchmarking-report.docx');
};
