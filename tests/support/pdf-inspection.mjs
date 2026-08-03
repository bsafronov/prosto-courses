import { OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

export const isPdfVisualMark = (operator) =>
  operator === OPS.constructPath ||
  operator === OPS.paintImageXObject ||
  operator === OPS.paintInlineImageXObject;
