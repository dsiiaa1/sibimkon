export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ key: process.env.GEMINI_API_KEY })
}
