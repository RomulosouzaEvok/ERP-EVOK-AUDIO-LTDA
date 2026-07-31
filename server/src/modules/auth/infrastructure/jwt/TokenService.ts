import jwt from 'jsonwebtoken';

import { getJwtRuntimeConfig } from '../../../../config/runtimeEnv';

class TokenService {
  public generateToken(userId: number): string {
    const { secret, expiresIn } = getJwtRuntimeConfig();

    return jwt.sign({ id: userId }, secret, {
      expiresIn,
    } as jwt.SignOptions);
  }
}

export = TokenService;
