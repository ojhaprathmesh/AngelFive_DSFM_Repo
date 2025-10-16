"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { handleFormSubmission, extractFormData } from "@/lib/form-handler"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Store form reference before async operations
    const formElement = event.currentTarget;
    
    try {
      const formData = extractFormData(formElement, 'SIGNUP');
      const success = await handleFormSubmission(formData);
      
      if (success && formElement) {
        // Reset form on successful submission
        formElement.reset();
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Fill in the form below to create your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="name">Full Name</FieldLabel>
          <Input id="name" name="name" type="text" placeholder="John Doe" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" name="password" type="password" required />
          <FieldDescription>
            Must be at least 8 characters long.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <Input id="confirm-password" name="confirm-password" type="password" required />
          <FieldDescription>Please confirm your password.</FieldDescription>
        </Field>
        <Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </Button>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <Button variant="outline" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path d="M24.7,20.5v7.6H35.6a10.9,10.9,0,0,1-10.9,8,12.1,12.1,0,1,1,7.9-21.3l5.6-5.6A20,20,0,1,0,24.7,44c16.8,0,20.5-15.7,18.9-23.5Z"/>
            </svg>
            Sign up with Google
          </Button>
          <FieldDescription className="px-6 text-center">
            Already have an account?{" "}
            <a href="/login" className="underline underline-offset-4">
              Log in
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
