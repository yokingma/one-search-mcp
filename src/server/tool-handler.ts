export interface ToolExecutionContext {
  signal: AbortSignal;
}

export interface ToolLogMessage {
  level: 'info' | 'error';
  data: string;
}

export interface CreateToolHandlerOptions {
  logMessage?: (message: ToolLogMessage) => Promise<void>;
}

export function createToolHandler<TInput, TOutput, TContext extends ToolExecutionContext = ToolExecutionContext>(
  toolName: string,
  handler: (args: TInput, context: TContext) => Promise<TOutput>,
  options: CreateToolHandlerOptions = {},
) {
  return async (args: TInput, context: TContext) => {
    const startTime = Date.now();

    try {
      if (options.logMessage) {
        await options.logMessage({
          level: 'info',
          data: `[${new Date().toISOString()}] Request started for tool: [${toolName}]`,
        });
      }

      const result = await handler(args, context);

      if (options.logMessage) {
        await options.logMessage({
          level: 'info',
          data: `[${new Date().toISOString()}] Request completed in ${Date.now() - startTime}ms`,
        });
      }

      return result;
    } catch (error) {
      if (options.logMessage) {
        await options.logMessage({
          level: 'error',
          data: `[${new Date().toISOString()}] Error in ${toolName}: ${error}`,
        });
      }

      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text' as const,
            text: msg,
          },
        ],
        isError: true,
      };
    }
  };
}
