import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('AuthGuard checking:', state.url);

  if (authService.isAuthenticated()) {
    // Check if route requires specific roles
    const requiredRoles = route.data?.['roles'] as Array<string>;
    if (requiredRoles) {
        if (authService.hasRole(requiredRoles)) {
            return true;
        } else {
             // Redirect to dashboard or access denied if not authorized
             console.log('AuthGuard: Access denied, redirecting to /');
             router.navigate(['/']); 
             return false;
        }
    }
    return true;
  }

  // Not logged in so redirect to login page
  console.log('AuthGuard: Not authenticated, redirecting to /login');
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
