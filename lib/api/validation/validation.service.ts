import { z } from 'zod';

/**
 * API Validation Service
 */
export class ValidationService {
  /**
   * Validate request body against a schema
   */
  static validateBody<T>(body: unknown, schema: z.ZodSchema<T>): T {
    try {
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new Error(`Validation error: ${messages}`);
      }
      throw error;
    }
  }

  /**
   * Validate query parameters against a schema
   */
  static validateQuery<T>(query: Record<string, string | string[] | undefined>, schema: z.ZodSchema<T>): T {
    try {
      // Convert query parameters to appropriate types
      const processedQuery: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined) continue;
        
        if (Array.isArray(value)) {
          processedQuery[key] = value;
        } else {
          // Try to convert common types
          if (value === 'true') processedQuery[key] = true;
          else if (value === 'false') processedQuery[key] = false;
          else if (!isNaN(Number(value))) processedQuery[key] = Number(value);
          else processedQuery[key] = value;
        }
      }
      
      return schema.parse(processedQuery);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new Error(`Query validation error: ${messages}`);
      }
      throw error;
    }
  }

  /**
   * Validate headers against a schema
   */
  static validateHeaders<T>(headers: Headers, schema: z.ZodSchema<T>): T {
    try {
      const headersObject: Record<string, string> = {};
      headers.forEach((value, key) => {
        headersObject[key.toLowerCase()] = value;
      });
      
      return schema.parse(headersObject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new Error(`Headers validation error: ${messages}`);
      }
      throw error;
    }
  }

  /**
   * Create a standardized error response
   */
  static createErrorResponse(error: Error, status: number = 400): Response {
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Create a standardized success response
   */
  static createSuccessResponse<T>(data: T, status: number = 200): Response {
    return new Response(
      JSON.stringify(data),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(query: Record<string, any>): {
    page: number;
    limit: number;
    offset: number;
  } {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }
}
