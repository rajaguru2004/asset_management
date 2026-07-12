import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface TransformedResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Wraps every successful controller return in a consistent envelope:
 * `{ success: true, data: <controllerReturn> }`.
 *
 * If the controller already returns an object that carries a `success`
 * key, it is passed through untouched (so services may craft their own
 * envelope when needed). Null/undefined returns are wrapped safely.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, TransformedResponse<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<TransformedResponse<T> | T> {
    return next.handle().pipe(
      map((data) => {
        if (
          data !== null &&
          data !== undefined &&
          typeof data === 'object' &&
          'success' in data
        ) {
          return data;
        }

        return {
          success: true,
          data: (data ?? null) as T,
        };
      }),
    );
  }
}
