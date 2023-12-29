import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, map } from 'rxjs';
import { AuthenticationService } from '../../shared/authentication.service';
import { LoginService } from './services/login.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  public loginForm!: FormGroup;
  public componentTitle: string = 'Sign Into Your Account'; 
  public errorMessage: string = '';

  constructor(
    private formBulder: FormBuilder,
    private authenticationService: AuthenticationService,
    private loginService: LoginService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.formBulder.group({
      email: new FormControl('', [Validators.email, Validators.required]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
      ]),
    });
  }

  onSubmit(): void {
    const { email, password } = this.loginForm.value;

    if (!email || !password) {
      this.errorMessage = "All fields are required";
      return;
    }

    const sub: Subscription = this.authenticationService
      .login({
        email,
        password,
      })
      .pipe(map((credential) => credential.user))
      .subscribe({
        next: async (user) => {
          const userToken = await user.getIdToken();

          // Create a profile for the user if the user does not have a profile
          this.loginService
            .getProfile(userToken)
            .subscribe(async (response) => {
              if (!response.profile) {
                this.loginService.createProfile(userToken).subscribe((res) => {
                  localStorage.setItem(
                    this.authenticationService.userKey,
                    JSON.stringify({ ...user, profile: res.user?.profile })
                  );
                  return;
                });
              }

              localStorage.setItem(
                this.authenticationService.userKey,
                JSON.stringify({ ...user, profile: response.profile })
              );

              // Redirect to home page
              this.router.navigate(['']);
            });
        },
        error: (error: Error) => {
    
          switch (error?.message) {
            case 'Firebase: Error (auth/invalid-email).':
              this.errorMessage = 'Invalid email format';
              break;
            case 'Firebase: Error (auth/invalid-credential).':
              this.errorMessage = 'Invalid email or password';
              break;
            default:
              this.errorMessage = 'Login failed: An unknown error occurred.';
          }
          
          sub.unsubscribe();
        },
        complete: () => sub.unsubscribe(),
      });

    this.loginForm.reset();
  }
}
