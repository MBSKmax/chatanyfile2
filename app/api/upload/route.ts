import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name.toLowerCase();
    const mimeType = file.type;
    let content = "";

    // ─── PDF ───
    if (fileName.endsWith(".pdf") || mimeType === "application/pdf") {
      try {
        const pdfParse = require("pdf-parse/lib/pdf-parse");
        const data = await pdfParse(buffer);
        content = data.text;
      } catch {
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);
        content = data.text;
      }

      // ─── WORD ───
    } else if (
      fileName.endsWith(".docx") ||
      fileName.endsWith(".doc") ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;

      // ─── EXCEL ───
    } else if (
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls") ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel"
    ) {
      const XLSX = require("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheets: string[] = [];
      workbook.SheetNames.forEach((name: string) => {
        const sheet = workbook.Sheets[name];
        sheets.push(
          `=== Sheet: ${name} ===\n${XLSX.utils.sheet_to_csv(sheet)}`,
        );
      });
      content = sheets.join("\n\n");

      // ─── PPT ───
    } else if (
      fileName.endsWith(".pptx") ||
      fileName.endsWith(".ppt") ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      mimeType === "application/vnd.ms-powerpoint"
    ) {
      const JSZip = require("jszip");
      const zip = await JSZip.loadAsync(buffer);
      const texts: string[] = [];
      const slideFiles = Object.keys(zip.files)
        .filter((n: string) => /ppt\/slides\/slide\d+\.xml/.test(n))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || "0");
          const numB = parseInt(b.match(/\d+/)?.[0] || "0");
          return numA - numB;
        });

      for (const sf of slideFiles) {
        const xml = await zip.files[sf].async("string");
        const stripped = xml.replace(/<\/a:t>/g, " </a:t>");
        const matches = stripped.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
        const text = matches
          .map((m: string) => m.replace(/<[^>]+>/g, "").trim())
          .filter((t: string) => t.length > 0)
          .join(" ");
        const slideNum = sf.match(/slide(\d+)/)?.[1] || "";
        if (text.trim()) texts.push(`[Slide ${slideNum}]: ${text}`);
      }
      content = texts.join("\n\n");

      // ─── TEXT BASED ───
    } else if (
      fileName.endsWith(".txt") ||
      fileName.endsWith(".csv") ||
      fileName.endsWith(".md") ||
      fileName.endsWith(".json") ||
      fileName.endsWith(".xml") ||
      fileName.endsWith(".html") ||
      fileName.endsWith(".htm") ||
      fileName.endsWith(".rtf") ||
      fileName.endsWith(".log") ||
      fileName.endsWith(".yaml") ||
      fileName.endsWith(".yml") ||
      fileName.endsWith(".toml") ||
      mimeType.startsWith("text/")
    ) {
      content = buffer.toString("utf-8");
    } else {
      // Last resort — try as text
      try {
        content = buffer.toString("utf-8");
        if (!content.trim()) {
          return NextResponse.json(
            { error: `File type not supported: ${fileName}` },
            { status: 400 },
          );
        }
      } catch {
        return NextResponse.json(
          { error: `File type not supported: ${fileName}` },
          { status: 400 },
        );
      }
    }

    if (content.length > 20000) {
  content = content.slice(0, 20000) + '\n\n[File truncated — too large]'
}

    if (!content.trim()) {
      return NextResponse.json(
        { error: "No readable text found in file" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      content,
      fileName: file.name,
      chars: content.length,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 },
    );
  }
}
