export function resolveOpenAIProviderOptions(modelName?: string | null): Record<string, any> {
  const supportsEncryptedReasoning = typeof modelName === 'string' && /gpt-5/i.test(modelName)
  return supportsEncryptedReasoning
    ? { reasoningSummary: 'detailed', include: ['reasoning.encrypted_content'] }
    : {}
}


