import { StackContext, ViteStaticSite, use } from '@serverless-stack/resources';

import { OpenAPIStack } from './OpenAPIStack';

export function DocsStack({ stack }: StackContext) {
  const { OPEN_API_URL } = use(OpenAPIStack);

  // This static site will hold our generated OpenAPI Docs
  const site = new ViteStaticSite(stack, 'Site', {
    path: 'frontend/api-docs',
    disablePlaceholder: true,
    environment: {
      VITE_API_URL: OPEN_API_URL.value,
    },
  });

  stack.addOutputs({
    DocsSiteURL: site.url,
  });
}
