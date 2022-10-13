import { App } from '@serverless-stack/resources';

import { DataStack } from './DataStack';
import { DocsStack } from './DocsStack';
import { OpenAPIStack } from './OpenAPIStack';
import { tRPCStack } from './tRPCStack';

export default function (app: App) {
  if (app.stage !== 'prod') app.setDefaultRemovalPolicy('destroy');

  app.setDefaultFunctionProps({
    runtime: 'nodejs16.x',
    srcPath: 'services',
    bundle: {
      format: 'esm',
    },
  });

  // 🥞
  app.stack(DataStack).stack(tRPCStack).stack(OpenAPIStack).stack(DocsStack);
}
