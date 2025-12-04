"use server";

import { cookies } from "next/headers";

// API Gateway URL (configured via environment variable)
const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3001';

/**
 * Sign up with email - connects to backend /api/users/register
 * Backend automatically sends welcome email via Kafka event
 */
export const signUpWithEmail = async ({
  email,
  password,
  fullName,
  country,
  investmentGoals,
  riskTolerance,
  preferredIndustry,
}: SignUpFormData) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name: fullName,
        investmentGoal: investmentGoals,
        riskTolerance: riskTolerance?.toLowerCase(),
        preferredIndustries: preferredIndustry ? [preferredIndustry] : [],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Бүртгүүлэхэд алдаа гарлаа',
      };
    }

    // Store token in cookie
    if (data.token) {
      const cookieStore = await cookies();
      cookieStore.set('auth-token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    return { 
      success: true, 
      data: {
        user: data.user,
        token: data.token,
      }
    };
  } catch (error) {
    console.error("Sign up failed", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Бүртгүүлэхэд алдаа гарлаа",
    };
  }
};

/**
 * Sign in with email - connects to backend /api/users/login
 */
export const signInWithEmail = async ({ email, password }: SignInFormData) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Нууц үг, эсвэл и-мэйлээ шалгана уу',
      };
    }

    // Store token in cookie
    if (data.token) {
      const cookieStore = await cookies();
      cookieStore.set('auth-token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    return { 
      success: true, 
      data: {
        user: data.user,
        token: data.token,
      }
    };
  } catch (error) {
    console.error("Sign in failed", error);
    return { 
      success: false, 
      error: "Нууц үг, эсвэл и-мэйлээ шалгана уу" 
    };
  }
};

/**
 * Sign out - clears auth cookie
 */
export const signOut = async () => {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
    return { success: true };
  } catch (error) {
    console.error("Sign out failed", error);
    return { success: false, error: "Системээс салахад алдаа гарлаа" };
  }
};

/**
 * Get current user from token
 */
export const getCurrentUser = async () => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return { success: false, user: null };
    }

    const response = await fetch(`${API_GATEWAY_URL}/api/users/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // Token expired or invalid
      const cookieStore = await cookies();
      cookieStore.delete('auth-token');
      return { success: false, user: null };
    }

    return { 
      success: true, 
      user: data.user,
    };
  } catch (error) {
    console.error("Get current user failed", error);
    return { success: false, user: null };
  }
};

/**
 * Get auth token for API calls
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('auth-token')?.value || null;
  } catch {
    return null;
  }
};
