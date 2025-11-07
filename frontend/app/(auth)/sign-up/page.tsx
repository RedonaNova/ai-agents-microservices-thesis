"use client";
import { CountrySelectField } from "@/components/forms/CountrySelect";
import FooterLink from "@/components/forms/FooterLink";
import InputField from "@/components/forms/InputField";
import SelectField from "@/components/forms/SelectField";
import { Button } from "@/components/ui/button";
import { signUpWithEmail } from "@/lib/actions/auth.actions";
import {
  INVESTMENT_GOALS,
  PREFERRED_INDUSTRIES,
  RISK_TOLERANCE_OPTIONS,
} from "@/lib/constants";
import React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const SignUp = () => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      country: "MN",
      investmentGoals: "",
      riskTolerance: "",
      preferredIndustry: "",
    },
    mode: "onBlur",
  });
  const onSubmit: SubmitHandler<SignUpFormData> = async (
    data: SignUpFormData
  ) => {
    try {
      console.log(data);
      const result = await signUpWithEmail(data);
      if (result.success) {
        toast.success("Бүртгүүлэлт амжилттай");
        router.push("/");
      }
      //SignUp with email
    } catch (error) {
      console.error(error);
      toast.error("Бүртгүүлэлт амжилтгүй", {
        description:
          error instanceof Error ? error.message : "Хаяг үүсгэхэд алдаа гарлаа",
      });
    }
  };
  return (
    <>
      <h1 className="form-title">Бүртгүүлэх</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <InputField
          name="fullName"
          label="Нэр"
          placeholder="Болд"
          register={register}
          error={errors.fullName}
          validation={{
            required: "Нэр заавал оруулна уу",
          }}
        />
        <InputField
          name="email"
          label="И-мэйл"
          placeholder="bold@gmail.com"
          register={register}
          error={errors.email}
          validation={{
            required: "И-мэйл заавал оруулна уу",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "И-мэйл буруу байна",
            },
          }}
        />
        <InputField
          name="password"
          label="Нууц үг"
          placeholder="Нууц үг оруулна уу"
          register={register}
          type="password"
          error={errors.password}
          validation={{
            required: "Нууц үг заавал оруулна уу",
            minLength: {
              value: 8,
              message: "Нууц үг хамгийн багадаа 8 оронтой байх ёстой",
            },
          }}
        />
        <CountrySelectField
          name="country"
          label="Улс"
          control={control}
          error={errors.country}
          required={true}
        />
        <SelectField
          name="investmentGoals"
          label="Хөрөнгө оруулах зорилго"
          placeholder="Хөрөнгө оруулах зорилго оруулна уу"
          options={INVESTMENT_GOALS}
          control={control}
          error={errors.investmentGoals}
          required={true}
        />
        <SelectField
          name="riskTolerance"
          label="Алдагдал хүлээх хэмжээ"
          placeholder="Алдагдал хүлээх хэмжээ оруулна уу"
          options={RISK_TOLERANCE_OPTIONS}
          control={control}
          error={errors.riskTolerance}
          required={true}
        />
        <SelectField
          name="preferredIndustry"
          label="Хөрөнгө оруулах салбар"
          placeholder="Хөрөнгө оруулах салбараа оруулна уу"
          options={PREFERRED_INDUSTRIES}
          control={control}
          error={errors.preferredIndustry}
          required={true}
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="yellow-btn w-full mt-5"
        >
          {isSubmitting ? "Хаяг үүсгэж байна" : "Хаяг үүсгэх"}
        </Button>
        <FooterLink text="Хаяг байгаа юу?" linkText="Нэвтрэх" href="/sign-in" />
      </form>
    </>
  );
};

export default SignUp;
