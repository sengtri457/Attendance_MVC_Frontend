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
        const user = authService.currentUserValue;
        
        // Special check for students accessing their own profile
        if (user?.role === 'student' && state.url.includes('/students/')) {
           const urlParts = state.url.split('/');
           const requestedId = Number(urlParts[urlParts.length - 1]);
           
           if (user.profile_id === requestedId) {
             return true;
           } else {
             console.log('AuthGuard: Student tried to access another profile');
             // Redirect to their own profile if they try to access others
             if (user.profile_id) {
               router.navigate(['/students', user.profile_id]);
             } else {
               router.navigate(['/login']);
             }
             return false;
           }
        }

        if (authService.hasRole(requiredRoles)) {
            return true;
        } else {
             // Redirect to dashboard or access denied if not authorized
             console.log('AuthGuard: Access denied, redirecting to /');
             
             if (user?.role === 'student' && user.profile_id) {
                router.navigate(['/students', user.profile_id]);
             } else {
                router.navigate(['/']); 
             }
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
