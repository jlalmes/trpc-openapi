import { openApiDocument } from '../../server/openapi';

// Respond with our OpenAPI schema
export default defineEventHandler(() => {
  return openApiDocument;
});
