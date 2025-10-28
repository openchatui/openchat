import { swaggerSpec } from './swaggerSpec'

export function GET() {
  return new Response(JSON.stringify(swaggerSpec), {
    headers: { 'Content-Type': 'application/json' },
  })
}


