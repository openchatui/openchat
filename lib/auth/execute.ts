import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ZodError } from "zod";

type Options<T> = {
  actionFn: () => Promise<T>;
  successMessage?: string;
};

const executeAction = async <T>({
  actionFn,
  successMessage = "The action was successful",
}: Options<T>): Promise<{ success: boolean; message: string }> => {
  try {
    await actionFn();

    return {
      success: true,
      message: successMessage,
    };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const errorMessage = error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
      return {
        success: false,
        message: errorMessage,
      };
    }

    // Handle other known errors
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: false,
      message: "An unexpected error has occurred",
    };
  }
};

export { executeAction };