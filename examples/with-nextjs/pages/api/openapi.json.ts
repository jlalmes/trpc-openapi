import { NextApiRequest, NextApiResponse } from 'next';

import { openApiDocument } from '../../server/openapi';

const hander = (req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).send(openApiDocument);
};

export default hander;
