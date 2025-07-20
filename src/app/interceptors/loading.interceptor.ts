import { HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { inject } from '@angular/core';
import { LoadingService } from '../services/loading';

export function loadingInterceptor(request: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const loadingService = inject(LoadingService);

  console.log('LoadingInterceptor: Request intercepted', { url: request.url, method: request.method });

  // Skip loading indicator for certain requests if needed
  if (shouldSkipLoading(request)) {
    console.log('LoadingInterceptor: Skipping loading for request', { url: request.url });
    return next(request);
  }

  // Start loading
  console.log('LoadingInterceptor: Starting loading for request', { url: request.url });
  loadingService.startLoading();

  return next(request).pipe(
    tap({
      next: (event) => {
        console.log('LoadingInterceptor: Request successful', { url: request.url });
      },
      error: (error: HttpErrorResponse) => {
        console.error('LoadingInterceptor: API Error:', error);
      }
    }),
    finalize(() => {
      // Stop loading when request completes (success or error)
      console.log('LoadingInterceptor: Stopping loading for request', { url: request.url });
      loadingService.stopLoading();
    })
  );
}

/**
 * Determine if loading should be skipped for this request
 */
function shouldSkipLoading(request: HttpRequest<unknown>): boolean {
  // Skip loading for certain endpoints if needed
  const skipEndpoints: string[] = [
    // Add any endpoints that shouldn't trigger loading
  ];
  
  return skipEndpoints.some(endpoint => 
    request.url.includes(endpoint)
  );
} 