import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, UserProfile, UpdateProfilePayload, ChangePasswordPayload } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  loading = true;
  activeTab: 'overview' | 'edit' | 'security' = 'overview';

  // Edit profile form
  editForm = {
    username: '',
    email: '',
    full_name: ''
  };
  editLoading = false;
  editSuccess = '';
  editError = '';

  // Change password form
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  passwordLoading = false;
  passwordSuccess = '';
  passwordError = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.loading = true;
    this.userService.getProfile().subscribe({
      next: (data) => {
        this.profile = data;
        this.editForm = {
          username: data.username || '',
          email: data.email || '',
          full_name: data.full_name || ''
        };
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        this.loading = false;
      }
    });
  }

  switchTab(tab: 'overview' | 'edit' | 'security') {
    this.activeTab = tab;
    this.editSuccess = '';
    this.editError = '';
    this.passwordSuccess = '';
    this.passwordError = '';
  }

  getInitials(): string {
    if (this.profile?.full_name) {
      return this.profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return (this.profile?.username || 'U')[0].toUpperCase();
  }

  getRoleBadgeClass(): string {
    switch (this.profile?.role) {
      case 'admin': return 'role-admin';
      case 'teacher': return 'role-teacher';
      case 'student': return 'role-student';
      default: return '';
    }
  }

  getRoleIcon(): string {
    switch (this.profile?.role) {
      case 'admin': return 'bi-shield-check';
      case 'teacher': return 'bi-mortarboard';
      case 'student': return 'bi-backpack';
      default: return 'bi-person';
    }
  }

  getAccountAge(): string {
    if (!this.profile?.createdAt) return 'N/A';
    const created = new Date(this.profile.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return '1 day';
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    }
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? 's' : ''}`;
  }

  saveProfile() {
    this.editLoading = true;
    this.editSuccess = '';
    this.editError = '';

    const payload: UpdateProfilePayload = {
      username: this.editForm.username,
      email: this.editForm.email || undefined,
      full_name: this.editForm.full_name || undefined
    };

    this.userService.updateProfile(payload).subscribe({
      next: (data) => {
        this.editLoading = false;
        this.editSuccess = 'Profile updated successfully!';
        
        // Update local storage and auth state with new token
        if (data.token) {
          localStorage.setItem('token', data.token);
          const currentUser = this.authService.currentUserValue;
          if (currentUser) {
            const updated = { ...currentUser, username: data.username };
            localStorage.setItem('currentUser', JSON.stringify(updated));
          }
        }
        
        // Reload profile to reflect changes
        this.loadProfile();
      },
      error: (err) => {
        this.editLoading = false;
        this.editError = err.error?.message || 'Failed to update profile';
      }
    });
  }

  changePassword() {
    this.passwordLoading = true;
    this.passwordSuccess = '';
    this.passwordError = '';

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError = 'New passwords do not match';
      this.passwordLoading = false;
      return;
    }

    if (this.passwordForm.newPassword.length < 6) {
      this.passwordError = 'Password must be at least 6 characters';
      this.passwordLoading = false;
      return;
    }

    const payload: ChangePasswordPayload = {
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword
    };

    this.userService.changePassword(payload).subscribe({
      next: () => {
        this.passwordLoading = false;
        this.passwordSuccess = 'Password changed successfully!';
        this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
      },
      error: (err) => {
        this.passwordLoading = false;
        this.passwordError = err.error?.message || 'Failed to change password';
      }
    });
  }

  getPasswordStrength(): { level: string; percent: number; color: string } {
    const pw = this.passwordForm.newPassword;
    if (!pw) return { level: '', percent: 0, color: '' };
    
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { level: 'Weak', percent: 20, color: '#ef4444' };
    if (score === 2) return { level: 'Fair', percent: 40, color: '#f97316' };
    if (score === 3) return { level: 'Good', percent: 60, color: '#eab308' };
    if (score === 4) return { level: 'Strong', percent: 80, color: '#22c55e' };
    return { level: 'Excellent', percent: 100, color: '#10b981' };
  }
}
