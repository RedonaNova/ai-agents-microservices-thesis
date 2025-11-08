"use server";

import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";

// API Gateway URL (configured via environment variable)
const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3001';

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
    const response = await auth.api.signUpEmail({
      body: { email, password, name: fullName },
    });

    if (response?.user) {
      // Send registration event to API Gateway (replaces Inngest)
      try {
        await fetch(`${API_GATEWAY_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            name: fullName,
            country,
            investmentGoals,
            riskTolerance,
            preferredIndustry,
          }),
        });
      } catch (kafkaError) {
        // Log but don't fail registration if welcome email fails
        console.error('Failed to send registration event:', kafkaError);
      }
    }
    return { success: true, data: response };
  } catch (error) {
    console.log("Sign up failed", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sign up failed",
    };
  }
};
export const signOut = async () => {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });
    return { success: true };
  } catch (error) {
    console.log("Sign out failed", error);
    return { success: false, error: "Системээс салахад алдаа гарлаа" };
  }
};
export const signInWithEmail = async ({ email, password }: SignInFormData) => {
  try {
    const response = await auth.api.signInEmail({
      body: { email, password },
    });
    return { success: true, data: response };
  } catch (error) {
    console.log("Sign in failed", error);
    return { success: false, error: "Нууц үг, эсвэл и-мэйлээ шалгана уу" };
  }
};
