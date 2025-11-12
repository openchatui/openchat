import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getGoogleFileModifiedTime,
  updateGoogleDocPlainText,
  exportGoogleDriveFile,
  updateGoogleDocFromHTML,
} from "@/lib/modules/drive/providers/google-drive.service";

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  return await new Promise<string>((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

/**
 * @swagger
 * /api/v1/drive/file/{id}/sync:
 *   get:
 *     tags: [Drive]
 *     summary: Get Google Drive file metadata or HTML export
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: mode
 *         required: false
 *         schema:
 *           type: string
 *           enum: [meta, html]
 *         description: meta returns modifiedMs JSON; html returns text/html body
 *     responses:
 *       200:
 *         description: Metadata JSON or HTML content
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to sync
 *   post:
 *     tags: [Drive]
 *     summary: Update a Google Doc from provided HTML
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               html:
 *                 type: string
 *     responses:
 *       200:
 *         description: Update accepted
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to sync
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!id)
      return NextResponse.json({ error: "File ID required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "meta";

    if (mode === "meta") {
      const modifiedMs = await getGoogleFileModifiedTime(
        session.user.id,
        id
      );
      return NextResponse.json({ modifiedMs });
    }

    if (mode === "html") {
      const { stream } = await exportGoogleDriveFile(
        session.user.id,
        id,
        "text/html"
      );
      const html = await streamToString(stream);
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({ error: "Unsupported mode" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to sync (GET)" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!id)
      return NextResponse.json({ error: "File ID required" }, { status: 400 });

    const body = (await req.json().catch(() => null)) as { html?: string };
    if (!body?.html || typeof body.html !== "string") {
      return NextResponse.json(
        { error: "HTML content required" },
        { status: 400 }
      );
    }

    const html = body.html;
    // Preserve basic formatting in Google Docs
    await updateGoogleDocFromHTML(session.user.id, id, html);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to sync (POST)" },
      { status: 500 }
    );
  }
}
