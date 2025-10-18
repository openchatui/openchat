/**
 * Server-Sent Events (SSE) Service
 */
export class SSEService {
  /**
   * Add SSE headers to a response
   */
  static withSSEHeaders(response: Response): Response {
    const headers = new Headers(response.headers);
    headers.set('Content-Type', 'text/event-stream; charset=utf-8');
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('Connection', 'keep-alive');
    headers.set('X-Accel-Buffering', 'no');
    
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  }

  /**
   * Create an SSE response with proper headers
   */
  static createSSEResponse(stream: ReadableStream): Response {
    return this.withSSEHeaders(new Response(stream));
  }

  /**
   * Create a simple SSE event string
   */
  static formatSSEEvent(data: any, event?: string, id?: string): string {
    let eventString = '';
    
    if (id) {
      eventString += `id: ${id}\n`;
    }
    
    if (event) {
      eventString += `event: ${event}\n`;
    }
    
    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
    eventString += `data: ${jsonData}\n\n`;
    
    return eventString;
  }

  /**
   * Create a readable stream for SSE
   */
  static createSSEStream(
    generator: AsyncGenerator<any, void, unknown>
  ): ReadableStream {
    const encoder = new TextEncoder();
    
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of generator) {
            const eventData = SSEService.formatSSEEvent(chunk);
            controller.enqueue(encoder.encode(eventData));
          }
          controller.close();
        } catch (error) {
          console.error('SSE stream error:', error);
          const errorEvent = SSEService.formatSSEEvent(
            { error: 'Stream error occurred' },
            'error'
          );
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
        }
      }
    });
  }

  /**
   * Create a heartbeat stream to keep connections alive
   */
  static createHeartbeatStream(intervalMs: number = 30000): ReadableStream {
    const encoder = new TextEncoder();
    
    return new ReadableStream({
      start(controller) {
        const interval = setInterval(() => {
          const heartbeat = SSEService.formatSSEEvent(
            { timestamp: Date.now() },
            'heartbeat'
          );
          controller.enqueue(encoder.encode(heartbeat));
        }, intervalMs);

        // Clean up interval when stream is closed
        return () => {
          clearInterval(interval);
        };
      }
    });
  }
}


