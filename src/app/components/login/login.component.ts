import { Component } from '@angular/core';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  returnUrl: string;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Redirect if already logged in
    // if (this.authService.token) {
    //     this.router.navigate(['/dashboard']);
    // }

    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe({
      next: (user) => {
        // Redirect based on role
        if (user.role === 'student' && user.profile_id) {
             this.router.navigate(['/students', user.profile_id]);
        } else {
             // If returnUrl is just '/', goes to dashboard
             this.router.navigate([this.returnUrl]);
        }
        
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || error.statusText || 'Login failed';
        if (error.status === 400 || error.status === 404 || error.status === 401) {
             this.errorMessage = "Invalid Username or Password";
        }
        this.loading = false;
      }
    });
  }
}
