/**
 * 🏗️ Express Type Augmentations
 *
 * Extends the Express Request interface to include the authenticated user
 * object added by the `authenticate` middleware.
 *
 * @module types/express.d.ts
 */

declare namespace Express {
  interface Request {
    /** Authenticated user attached by the auth middleware. */
    user?: {
      id: number;
      name: string;
      email: string;
      role: 'admin' | 'operator' | 'financial';
      active: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    };

    /** Previous entity values for audit logging (set by middleware). */
    oldValues?: Record<string, unknown>;

    /** Uploaded file from multer. */
    file?: Express.Multer.File;
  }
}
