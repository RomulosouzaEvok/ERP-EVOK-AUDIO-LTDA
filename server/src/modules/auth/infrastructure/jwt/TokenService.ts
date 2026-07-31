import jwt from 'jsonwebtoken';

import { getJwtRuntimeConfig, JWT_ISSUER, JWT_AUDIENCE } from '../../../../config/runtimeEnv';

class TokenService {
  public generateToken(userId: number, passwordVersion = 1): string {
    const { secret, expiresIn } = getJwtRuntimeConfig();

    return jwt.sign({ id: userId, passwordVersion }, secret, {
      expiresIn,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    } as jwt.SignOptions);
  }
}

export = TokenService;
